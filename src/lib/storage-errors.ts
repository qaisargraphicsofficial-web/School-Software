import { auth } from '../firebase';

export enum StorageOperationType {
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  DELETE = 'delete',
  LIST = 'list',
}

export interface StorageErrorInfo {
  error: string;
  operationType: StorageOperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

export function handleStorageError(error: any, operationType: StorageOperationType, path: string | null) {
  let message = 'An unknown error occurred during file operation.';
  
  if (error.code) {
    switch (error.code) {
      case 'storage/unauthorized':
        message = 'You do not have permission to perform this file operation.';
        break;
      case 'storage/canceled':
        message = 'File operation was canceled.';
        break;
      case 'storage/unknown':
        message = 'An unknown error occurred in storage.';
        break;
      case 'storage/object-not-found':
        message = 'The file does not exist.';
        break;
      case 'storage/bucket-not-found':
        message = 'Storage bucket not found.';
        break;
      case 'storage/project-not-found':
        message = 'Project not found.';
        break;
      case 'storage/quota-exceeded':
        message = 'Storage quota exceeded. Please contact administrator.';
        break;
      case 'storage/unauthenticated':
        message = 'User is unauthenticated. Please log in.';
        break;
      case 'storage/retry-limit-exceeded':
        message = 'Operation timed out. Please try again.';
        break;
      case 'storage/invalid-checksum':
        message = 'File upload failed due to checksum mismatch.';
        break;
      default:
        message = error.message || message;
    }
  }

  const errInfo: StorageErrorInfo = {
    error: message,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    }
  };

  console.error('Storage Error:', JSON.stringify(errInfo));
  return message;
}
