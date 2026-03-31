import os
import base64
import json
import pickle
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

# Gmail libraries
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Outlook libraries
import msal
import requests

class MailProvider(ABC):
    @abstractmethod
    def authenticate(self):
        """Handle OAuth2 flow and token persistence."""
        pass

    @abstractmethod
    def create_draft_with_attachment(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        file_content: bytes, 
        file_name: str
    ) -> str:
        """Create a draft with an Excel attachment and return the draft ID."""
        pass

class GmailProvider(MailProvider):
    SCOPES = ['https://www.googleapis.com/auth/gmail.compose']
    
    def __init__(self, secrets_dir: str):
        self.secrets_dir = secrets_dir
        self.creds_path = os.path.join(secrets_dir, 'credentials.json')
        self.token_path = os.path.join(secrets_dir, 'token.pickle')
        self.creds = None
        self.service = None

    def authenticate(self):
        if os.path.exists(self.token_path):
            with open(self.token_path, 'rb') as token:
                self.creds = pickle.load(token)
        
        # If there are no (valid) credentials available, let the user log in.
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                if not os.path.exists(self.creds_path):
                    raise FileNotFoundError(f"Missing Gmail credentials! Please place 'credentials.json' in {self.secrets_dir}")
                
                flow = InstalledAppFlow.from_client_secrets_file(self.creds_path, self.SCOPES)
                # Note: In a real server, we might need a fixed port or handle redirect.
                # For local dev, this will open a browser.
                self.creds = flow.run_local_server(port=0)
            
            # Save the credentials for the next run
            with open(self.token_path, 'wb') as token:
                pickle.dump(self.creds, token)

        self.service = build('gmail', 'v1', credentials=self.creds)

    def create_draft_with_attachment(self, to: str, subject: str, body: str, file_content: bytes, file_name: str) -> str:
        if not self.service:
            self.authenticate()

        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        # Add body (UTF-8 plain text)
        display_body = body.replace('%0D%0A', '\n')
        message.attach(MIMEText(display_body, 'plain', 'utf-8'))

        # Add Excel attachment
        part = MIMEBase('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        part.set_payload(file_content)
        encoders.encode_base64(part)
        # 使用 library 內建方式設定參數，會自動處理非 ASCII 檔名編碼 (RFC 2231)
        part.add_header('Content-Disposition', 'attachment', filename=file_name)
        message.attach(part)

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        draft = self.service.users().drafts().create(
            userId='me',
            body={'message': {'raw': raw_message}}
        ).execute()
        
        return draft['id']

class OutlookProvider(MailProvider):
    # MS Graph API Scopes
    SCOPES = ['Mail.ReadWrite', 'Mail.Send']
    AUTHORITY = "https://login.microsoftonline.com/common"
    
    def __init__(self, secrets_dir: str, client_id: str = None):
        self.secrets_dir = secrets_dir
        self.config_path = os.path.join(secrets_dir, 'outlook_config.json')
        self.token_path = os.path.join(secrets_dir, 'outlook_token.json')
        self.client_id = client_id
        self.access_token = None

    def authenticate(self):
        # 優先使用傳入的 client_id，若無則讀取檔案
        client_id = self.client_id
        
        if not client_id:
            if not os.path.exists(self.config_path):
                raise FileNotFoundError(f"Missing Outlook config! Please create 'outlook_config.json' in {self.secrets_dir} or provide a Client ID in the UI.")
            
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            client_id = config.get('client_id')
        
        if not client_id:
            raise ValueError("Outlook Client ID is required.")
        
        app = msal.PublicClientApplication(client_id, authority=self.AUTHORITY)
        
        # Try loading from cache
        accounts = app.get_accounts()
        result = None
        if accounts:
            result = app.acquire_token_silent(self.SCOPES, account=accounts[0])
        
        if not result:
            # Device code flow is good for terminal-based apps
            flow = app.initiate_device_flow(scopes=self.SCOPES)
            if "message" in flow:
                print(flow["message"])
                # In a real app, we might need a more interactive way to show this
                # For now, we print it. Frontend can't see this easily unless we pipe it.
            
            result = app.acquire_token_by_device_flow(flow)
        
        if "access_token" in result:
            self.access_token = result["access_token"]
        else:
            raise Exception(f"Outlook Auth Failed: {result.get('error_description', 'Unknown error')}")

    def create_draft_with_attachment(self, to: str, subject: str, body: str, file_content: bytes, file_name: str) -> str:
        if not self.access_token:
            self.authenticate()

        display_body = body.replace('%0D%0A', '\n')
        
        # 1. Create Message Draft
        endpoint = "https://graph.microsoft.com/v1.0/me/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Message structure
        email_msg = {
            "subject": subject,
            "body": {
                "contentType": "Text",
                "content": display_body
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": to
                    }
                }
            ]
        }
        
        response = requests.post(endpoint, headers=headers, json=email_msg)
        if response.status_code != 201:
            raise Exception(f"Outlook Draft Creation Failed: {response.text}")
        
        message_id = response.json().get("id")
        
        # 2. Add Attachment
        attachment_endpoint = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments"
        attachment_data = {
            "@odata.type": "#microsoft.graph.fileAttachment",
            "name": file_name,
            "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "contentBytes": base64.b64encode(file_content).decode()
        }
        
        att_response = requests.post(attachment_endpoint, headers=headers, json=attachment_data)
        if att_response.status_code != 201:
            raise Exception(f"Outlook Attachment Failed: {att_response.text}")
            
        return message_id

class MailFactory:
    @staticmethod
    def get_provider(provider_type: str, secrets_dir_name: str = "secrets", client_id: str = None) -> MailProvider:
        # 取得當前執行路徑
        base_dir = os.getcwd()
        
        # 智慧路徑檢查：如果當前在 backend 資料夾內，直接找 secrets；
        # 如果在根目錄，則找 backend/secrets
        full_secrets_dir = os.path.join(base_dir, secrets_dir_name)
        if not os.path.exists(full_secrets_dir) and os.path.basename(base_dir) != "backend":
            full_secrets_dir = os.path.join(base_dir, "backend", secrets_dir_name)
        
        if not os.path.exists(full_secrets_dir):
            os.makedirs(full_secrets_dir)

        if provider_type.upper() == "GMAIL":
            return GmailProvider(full_secrets_dir)
        elif provider_type.upper() == "OUTLOOK":
            return OutlookProvider(full_secrets_dir, client_id=client_id)
        else:
            raise ValueError(f"Unsupported Provider: {provider_type}")
