import React, { useRef, useState } from 'react';
import { Box, Button, Paper, Typography, Modal, IconButton } from '@mui/material';
import { PhotoCamera, Close as CloseIcon } from '@mui/icons-material';
import styled from 'styled-components';

const PhotoInput = ({ onPhotoCapture, photoPreview }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStarted, setCameraStarted] = useState(false);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraStarted(true);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Unable to access camera. Please check permissions.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            setCameraStarted(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            const imageData = canvasRef.current.toDataURL('image/jpeg');
            onPhotoCapture(imageData);
            stopCamera();
            setShowCamera(false);
        }
    };

    const handleFileInput = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            onPhotoCapture(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const removePhoto = () => {
        onPhotoCapture('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Box>
            <label style={{ marginBottom: '10px', fontWeight: 'bold', display: 'block' }}>
                Student Photo
            </label>

            <InputContainer>
                <hidden>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </hidden>

                <ButtonGroup>
                    <CameraButton
                        onClick={() => {
                            setShowCamera(true);
                            setTimeout(startCamera, 100);
                        }}
                        startIcon={<PhotoCamera />}
                    >
                        📷 Take Photo
                    </CameraButton>

                    <FileButton onClick={() => fileInputRef.current?.click()}>
                        📁 Upload File
                    </FileButton>
                </ButtonGroup>
            </InputContainer>

            {photoPreview && (
                <PreviewContainer>
                    <PreviewImage src={photoPreview} alt="Student preview" />
                    <RemoveButton
                        onClick={removePhoto}
                        size="small"
                    >
                        <CloseIcon />
                    </RemoveButton>
                </PreviewContainer>
            )}

            <Modal open={showCamera} onClose={() => {
                stopCamera();
                setShowCamera(false);
            }}>
                <ModalContent>
                    <CloseButtonTop
                        onClick={() => {
                            stopCamera();
                            setShowCamera(false);
                        }}
                    >
                        <CloseIcon />
                    </CloseButtonTop>

                    <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                        Take Student Photo
                    </Typography>

                    <VideoPreview
                        ref={videoRef}
                        autoPlay
                        playsInline
                    />

                    <ButtonContainer>
                        <CaptureButton
                            variant="contained"
                            color="success"
                            onClick={capturePhoto}
                            disabled={!cameraStarted}
                        >
                            Capture Photo
                        </CaptureButton>

                        <CancelButton
                            variant="outlined"
                            onClick={() => {
                                stopCamera();
                                setShowCamera(false);
                            }}
                        >
                            Cancel
                        </CancelButton>
                    </ButtonContainer>
                </ModalContent>
            </Modal>
        </Box>
    );
};

const InputContainer = styled(Paper)`
    padding: 15px;
    margin-bottom: 15px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
`;

const CameraButton = styled(Button)`
    flex: 1;
    min-width: 120px;
    background-color: white;
    color: #667eea;
    font-weight: bold;
    
    &:hover {
        background-color: #f0f0f0;
    }
`;

const FileButton = styled(Button)`
    flex: 1;
    min-width: 120px;
    background-color: white;
    color: #667eea;
    font-weight: bold;
    
    &:hover {
        background-color: #f0f0f0;
    }
`;

const PreviewContainer = styled(Paper)`
    position: relative;
    margin-top: 15px;
    padding: 10px;
    border-radius: 8px;
    overflow: hidden;
`;

const PreviewImage = styled.img`
    width: 100%;
    max-width: 300px;
    height: auto;
    border-radius: 8px;
    display: block;
    margin: 0 auto;
`;

const RemoveButton = styled(IconButton)`
    position: absolute;
    top: 5px;
    right: 5px;
    background-color: rgba(255, 0, 0, 0.7);
    color: white;
    
    &:hover {
        background-color: rgba(255, 0, 0, 0.9);
    }
`;

const ModalContent = styled(Paper)`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #333;
    padding: 20px;
    border-radius: 8px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const CloseButtonTop = styled(IconButton)`
    position: absolute;
    top: 10px;
    right: 10px;
    color: white;
    
    &:hover {
        background-color: rgba(255, 0, 0, 0.7);
    }
`;

const VideoPreview = styled.video`
    width: 100%;
    max-width: 500px;
    height: auto;
    border-radius: 8px;
    background-color: black;
    margin: 20px 0;
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
`;

const CaptureButton = styled(Button)`
    min-width: 150px;
`;

const CancelButton = styled(Button)`
    min-width: 150px;
`;

export default PhotoInput;