# Image and Video Picker Implementation

This guide explains how to use the image and video picker functionality that has been added to the OneCrew app.

## Features Added

### 1. MediaPickerService
A comprehensive service for handling image and video selection from device:
- **Image picking** from gallery
- **Photo taking** with camera
- **Video selection** from gallery
- **Video recording** with camera
- **File validation** (size limits, duration limits)
- **Permission handling** (camera and media library)
- **File size formatting** utilities

### 2. ProfileCompletionPage Integration
The profile completion page now includes:
- **Profile picture selection** with camera/gallery options
- **Portfolio media** support for both images and videos
- **Real-time preview** of selected media
- **File validation** with user-friendly error messages
- **Improved UI** with dedicated buttons for different media types

## Usage Examples

### Basic Image Selection
```typescript
import MediaPickerService from '../services/MediaPickerService';

const mediaPicker = MediaPickerService.getInstance();

// Pick image from gallery
const result = await mediaPicker.pickImage({
  allowsEditing: true,
  quality: 0.8,
  aspect: [1, 1],
});

if (result) {
  console.log('Selected image:', result.uri);
  console.log('File size:', mediaPicker.formatFileSize(result.fileSize));
}
```

### Taking Photos
```typescript
// Take photo with camera
const result = await mediaPicker.takePhoto({
  allowsEditing: true,
  quality: 0.8,
  aspect: [1, 1],
});
```

### Video Selection
```typescript
// Pick video from gallery
const result = await mediaPicker.pickVideo({
  quality: 0.8,
});

// Record video with camera
const result = await mediaPicker.recordVideo({
  quality: 0.8,
});
```

### File Validation
```typescript
// Validate file size (max 10MB)
if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 10)) {
  Alert.alert('File Too Large', 'Please select a smaller file.');
  return;
}

// Validate video duration (max 5 minutes)
if (result.duration && result.duration > 300) {
  Alert.alert('Video Too Long', 'Please select a shorter video.');
  return;
}
```

## Configuration Options

### MediaPickerOptions
```typescript
interface MediaPickerOptions {
  allowsEditing?: boolean;        // Enable image editing
  quality?: number;              // Image quality (0-1)
  videoQuality?: 'low' | 'medium' | 'high';
  maxWidth?: number;             // Max width for images
  maxHeight?: number;            // Max height for images
  aspect?: [number, number];     // Aspect ratio [width, height]
  mediaTypes?: 'images' | 'videos' | 'all';
}
```

## File Size Limits

- **Profile pictures**: 10MB max
- **Portfolio images**: 20MB max
- **Portfolio videos**: 100MB max, 5 minutes max duration

## Permissions Required

The app automatically requests the following permissions:
- **Camera access** for taking photos and recording videos
- **Media library access** for selecting existing photos and videos

## Error Handling

The service includes comprehensive error handling:
- Permission denied scenarios
- File size validation
- Video duration validation
- Network errors during upload
- User cancellation

## Demo Component

A demo component (`ImagePickerDemo.tsx`) is available to test all functionality:
- Image selection and photo taking
- Video selection and recording
- File information display
- Error handling examples

## Integration Points

### ProfileCompletionPage
- Profile picture selection
- Portfolio media management
- Real-time preview updates

### Future Integration
The service can be easily integrated into other parts of the app:
- Project media uploads
- Team member profile pictures
- Communication attachments
- Any other media selection needs

## Dependencies

The implementation uses:
- `expo-image-picker` for image/video selection
- `expo-av` for video handling
- React Native's built-in components for UI

## Troubleshooting

### Common Issues
1. **Permission denied**: Ensure camera and media library permissions are granted
2. **File too large**: Check file size limits and compress if needed
3. **Video too long**: Ensure videos are under 5 minutes
4. **Upload failures**: Check network connection and server availability

### Debug Tips
- Check console logs for detailed error messages
- Use the demo component to test functionality
- Verify permissions in device settings
- Test with different file sizes and types
