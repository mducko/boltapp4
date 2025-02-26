import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createScopedLogger } from '../../utils/logger';

const logger = createScopedLogger('GoogleDriveProvider');

const FOLDER_NAME = 'Bolt.droid Backups';
const MIME_TYPE = 'application/octet-stream';

export class GoogleDriveProvider {
  private static instance: GoogleDriveProvider;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): GoogleDriveProvider {
    if (!GoogleDriveProvider.instance) {
      GoogleDriveProvider.instance = new GoogleDriveProvider();
    }
    return GoogleDriveProvider.instance;
  }

  async initialize(): Promise<void> {
    try {
      GoogleSignin.configure({
        scopes: ['https://www.googleapis.com/auth/drive.file'],
        webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      });

      this.isInitialized = true;
      logger.info('Google Drive provider initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Drive provider:', error);
      throw error;
    }
  }

  async signIn(): Promise<void> {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      logger.info('Signed in to Google Drive');
    } catch (error) {
      logger.error('Google Sign-in failed:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      logger.info('Signed out from Google Drive');
    } catch (error) {
      logger.error('Google Sign-out failed:', error);
      throw error;
    }
  }

  async upload(data: string, filename: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Google Drive provider not initialized');
    }

    try {
      // Check if signed in
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (!isSignedIn) {
        await this.signIn();
      }

      // Get access token
      const tokens = await GoogleSignin.getTokens();

      // Find or create backup folder
      const folderId = await this.getBackupFolder(tokens.accessToken);

      // Upload file
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
        body: this.createMultipartBody(data, filename, folderId),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('File uploaded successfully:', result.id);

      return result.id;
    } catch (error) {
      logger.error('Failed to upload to Google Drive:', error);
      throw error;
    }
  }

  private async getBackupFolder(accessToken: string): Promise<string> {
    try {
      // Check if folder exists
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const searchResult = await searchResponse.json();

      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0].id;
      }

      // Create folder if it doesn't exist
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      const createResult = await createResponse.json();
      return createResult.id;
    } catch (error) {
      logger.error('Failed to get/create backup folder:', error);
      throw error;
    }
  }

  private createMultipartBody(data: string, filename: string, folderId: string): FormData {
    const metadata = {
      name: filename,
      mimeType: MIME_TYPE,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([data], { type: MIME_TYPE }));

    return formData;
  }
}