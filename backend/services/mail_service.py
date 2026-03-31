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
        
        # App Password setup
        self.user = os.getenv("GMAIL_USER")
        self.app_password = os.getenv("GMAIL_APP_PASSWORD")
        if self.app_password:
            # 移除空格 (Google 給予時常有空格，但協議不需要)
            self.app_password = self.app_password.replace(" ", "").replace("\n", "").strip()
        
        self.use_app_password = bool(self.user and self.app_password)

    def authenticate(self):
        # 如果是 App Password 模式，不需要 OAuth2 認證
        if self.use_app_password:
            print(f"[Auth] Using App Password mode for {self.user}")
            return

        # 1. 嘗試從環境變數讀取 Token
        env_token_json = os.getenv("GMAIL_TOKEN_JSON")
        if env_token_json:
            try:
                from google.oauth2.credentials import Credentials
                token_data = json.loads(env_token_json)
                self.creds = Credentials.from_authorized_user_info(token_data, self.SCOPES)
                print(f"[Auth] Loaded GMAIL_TOKEN_JSON for account: {token_data.get('account')}")
            except Exception as e:
                print(f"[Auth] Failed to parse GMAIL_TOKEN_JSON: {e}")

        # 2. 如果環境變數沒有，嘗試從本地檔案讀取
        if (not self.creds or not self.creds.valid) and os.path.exists(self.token_path):
            try:
                with open(self.token_path, 'rb') as token:
                    self.creds = pickle.load(token)
                    print("[Auth] Loaded local token.pickle.")
            except Exception as e:
                print(f"[Auth] Failed to load local token.pickle: {e}")
        
        # 3. 處理過期自動重新整理 (加固防禦機制)
        if self.creds and self.creds.expired and self.creds.refresh_token:
            try:
                print("[Auth] Token expired, attempting to refresh...")
                self.creds.refresh(Request())
                print("[Auth] Token refreshed successfully.")
            except Exception as e:
                print(f"[Auth] Refresh failed ({e}), but proceeding with existing token if possible.")
                # 如果更新失敗但 Token 同時存在，我們不要直接崩潰，嘗試強行使用
                if not self.creds.token:
                    raise e
        
        # 4. 如果還是沒有有效憑證 (最後防線)
        if not self.creds or not self.creds.valid:
            env_creds_json = os.getenv("GMAIL_CREDENTIALS_JSON")
            if env_creds_json:
                creds_info = json.loads(env_creds_json)
                flow = InstalledAppFlow.from_client_config(creds_info, self.SCOPES)
            elif os.path.exists(self.creds_path):
                flow = InstalledAppFlow.from_client_secrets_file(self.creds_path, self.SCOPES)
            else:
                # 如果連 App Password 都沒有且 OAuth 資料也不足，才報錯
                if not self.use_app_password:
                    raise FileNotFoundError(f"Missing Gmail credentials! (GMAIL_CREDENTIALS_JSON env/file not found)")
            
            # 生產環境下直接報錯引導使用者更新環境變數
            if not self.use_app_password:
                if os.getenv("RENDER") or os.getenv("NETLIFY"):
                     raise Exception("Gmail Token is invalid/expired on server. Please use App Password or update GMAIL_TOKEN_JSON from local environment.")
                
                self.creds = flow.run_local_server(port=0)
                
                if not os.getenv("RENDER"):
                    os.makedirs(self.secrets_dir, exist_ok=True)
                    with open(self.token_path, 'wb') as token:
                        pickle.dump(self.creds, token)

        if self.creds:
            self.service = build('gmail', 'v1', credentials=self.creds, cache_discovery=False)

    def create_draft_with_attachment(self, to: str, subject: str, body: str, file_content: bytes, file_name: str) -> str:
        # 如果是 App Password 模式，使用 IMAP 建立草稿
        if self.use_app_password:
            return self._create_draft_via_imap(to, subject, body, file_content, file_name)

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
        part.add_header('Content-Disposition', 'attachment', filename=file_name)
        message.attach(part)

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        draft = self.service.users().drafts().create(
            userId='me',
            body={'message': {'raw': raw_message}}
        ).execute()
        
        return draft['id']

    def _create_draft_via_imap(self, to: str, subject: str, body: str, file_content: bytes, file_name: str) -> str:
        import imaplib
        import time
        from email import encoders
        
        print(f"[IMAP] Connecting to imap.gmail.com for {self.user}...")
        
        message = MIMEMultipart()
        message['To'] = to
        message['From'] = self.user
        message['Subject'] = subject
        display_body = body.replace('%0D%0A', '\n')
        message.attach(MIMEText(display_body, 'plain', 'utf-8'))

        part = MIMEBase('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        part.set_payload(file_content)
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', 'attachment', filename=file_name)
        message.attach(part)

        try:
            # 1. 連線與登入
            # 使用 SSL 安全連線到 Gmail IMAP
            mail = imaplib.IMAP4_SSL("imap.gmail.com")
            mail.login(self.user, self.app_password)
            
            # 2. 確定草稿夾名稱 (Gmail 預設通常是 "[Gmail]/Drafts" 或 "[Gmail]/草稿")
            drafts_folder = "[Gmail]/Drafts"
            status, folders = mail.list()
            if status == 'OK':
                for f in folders:
                    folder_name = f.decode()
                    # 智慧判斷：搜尋包含「草稿」或「Drafts」字樣的資料夾
                    if '"\u8349\u7a3f"' in folder_name or "Drafts" in folder_name: 
                        drafts_folder = folder_name.split(' "/" ')[-1].strip('"')
                        break

            # 3. 追加訊息到草稿夾
            print(f"[IMAP] Appending draft to {drafts_folder}...")
            # 第二個參數 "" 代表標記（Flags），我們保持空白
            mail.append(drafts_folder, "", imaplib.Time2Internaldate(time.time()), message.as_bytes())
            mail.logout()
            print("[IMAP] Draft created successfully via IMAP!")
            return "imap_draft_success"
        except Exception as e:
            print(f"[IMAP] Error: {e}")
            raise Exception(f"Failed to create draft via IMAP: {e}")

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
