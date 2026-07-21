import cv2

# Monkey patch to resolve protobuf 6+ compatibility issues with mediapipe
import google.protobuf.message_factory
from google.protobuf import message_factory
if not hasattr(message_factory.MessageFactory, 'GetPrototype'):
    def GetPrototype(self, descriptor):
        return self.GetMessageClass(descriptor)
    message_factory.MessageFactory.GetPrototype = GetPrototype

import mediapipe as mp
import numpy as np
import os
import base64

class PalmImageProcessor:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        # Use static image mode for frame-by-frame processing
        self.hands = self.mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    def decode_base64_image(self, base64_str):
        """Decode base64 image string (with or without data URI scheme) to OpenCV BGR image."""
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img

    def encode_image_to_base64(self, image, ext=".jpg"):
        """Encode OpenCV BGR image to base64 string."""
        _, buffer = cv2.imencode(ext, image)
        base64_str = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/jpeg;base64,{base64_str}"

    def get_structural_orientation(self, landmarks, width, height):
        """
        Determine if the hand in the image is structurally a LEFT or RIGHT hand.
        Uses the 2D cross product of the hand direction vector (Wrist -> Middle MCP)
        and the thumb vector (Wrist -> Thumb MCP).
        """
        # Landmark 0: WRIST
        p0 = np.array([landmarks[0].x * width, landmarks[0].y * height])
        # Landmark 2: THUMB_MCP
        p2 = np.array([landmarks[2].x * width, landmarks[2].y * height])
        # Landmark 9: MIDDLE_FINGER_MCP
        p9 = np.array([landmarks[9].x * width, landmarks[9].y * height])

        # Vectors
        v_dir = p9 - p0
        v_thumb = p2 - p0

        # 2D cross product: Ax * By - Ay * Bx
        # In OpenCV/Image coordinates: X goes right, Y goes down.
        # For a standard palm-facing-up hand pointing forward (Y decreasing):
        # - Right hand: thumb is on the left (smaller X). CP < 0.
        # - Left hand: thumb is on the right (larger X). CP > 0.
        cp = v_dir[0] * v_thumb[1] - v_dir[1] * v_thumb[0]

        if cp > 0:
            return "LEFT"
        else:
            return "RIGHT"

    def process_frame(self, image, expected_physical_orientation, is_mirrored=False):
        """
        Process a single image frame.
        - Detect 21 landmarks.
        - Validate hand presence and completeness.
        - Check hand orientation and correct for mirroring.
        - Apply Convex Hull background masking.
        - Extract ROI with padding.
        
        Returns:
            dict: {
                "status": "success" | "reject",
                "reason": str (if rejected),
                "masked_roi": numpy array (BGR cropped ROI with black background),
                "landmarks": list of dicts (x, y coordinates)
            }
        """
        h, w, c = image.shape
        
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_image)

        if not results.multi_hand_landmarks:
            return {
                "status": "reject",
                "reason": "Tangan tidak terdeteksi. Silakan posisikan tangan Anda di depan kamera."
            }

        # Take the first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]
        landmarks = hand_landmarks.landmark

        # Verify we have all 21 landmarks
        if len(landmarks) < 21:
            return {
                "status": "reject",
                "reason": "Tangan tidak utuh. Pastikan seluruh tangan dan jari berada di dalam area kamera."
            }

        # Check structural orientation
        structural_hand = self.get_structural_orientation(landmarks, w, h)

        # Map structural orientation to physical hand based on mirroring
        # Mirroring flips left/right. So:
        # - Physical RIGHT hand on mirrored camera looks like structural LEFT hand.
        # - Physical LEFT hand on mirrored camera looks like structural RIGHT hand.
        # - Physical RIGHT hand on non-mirrored camera looks like structural RIGHT hand.
        # - Physical LEFT hand on non-mirrored camera looks like structural LEFT hand.
        if is_mirrored:
            detected_physical = "RIGHT" if structural_hand == "LEFT" else "LEFT"
        else:
            detected_physical = structural_hand

        # Match with expected physical orientation
        if detected_physical != expected_physical_orientation:
            return {
                "status": "reject",
                "reason": f"Orientasi tangan salah. Harap posisikan Tangan {expected_physical_orientation} (terdeteksi: {detected_physical})."
            }

        # Get list of pixel coordinates of all 21 points
        points = []
        for lm in landmarks:
            cx, cy = int(lm.x * w), int(lm.y * h)
            points.append([cx, cy])
        
        points = np.array(points, dtype=np.int32)

        # 1. Check if entire hand is visible (not cut off at the camera boundaries)
        # If landmarks touch the edges, we provide specific shift or move away instructions
        margin = 0.01  # 1% boundary margin
        touched_borders = []
        for lm in landmarks:
            if lm.y < margin and "Geser ke BAWAH" not in touched_borders:
                touched_borders.append("Geser ke BAWAH")
            if lm.y > (1.0 - margin) and "Geser ke ATAS" not in touched_borders:
                touched_borders.append("Geser ke ATAS")
            if lm.x < margin and "Geser ke KANAN" not in touched_borders:
                touched_borders.append("Geser ke KANAN")
            if lm.x > (1.0 - margin) and "Geser ke KIRI" not in touched_borders:
                touched_borders.append("Geser ke KIRI")
                
        if touched_borders:
            if len(touched_borders) >= 2:
                return {
                    "status": "reject",
                    "reason": "Tangan terlalu dekat. Jauhkan tangan Anda sedikit dari kamera."
                }
            else:
                return {
                    "status": "reject",
                    "reason": f"Tangan terpotong. Petunjuk: {touched_borders[0]}."
                }

        # 2. Check hand distance (too far check)
        x_min, y_min = np.min(points, axis=0)
        x_max, y_max = np.max(points, axis=0)
        box_h = y_max - y_min
        norm_h = box_h / h
        
        # If the hand spans less than 33% of the camera height, it is too far
        if norm_h < 0.33:
            return {
                "status": "reject",
                "reason": "Tangan terlalu jauh. Dekatkan tangan Anda ke kamera."
            }

        # 3. Check if the hand is centered matching the guidelines
        center_x = (x_min + x_max) / 2
        center_y = (y_min + y_max) / 2
        norm_center_x = center_x / w
        norm_center_y = center_y / h
        
        # Check if the center of the hand is within 20% of the frame center (0.5, 0.5)
        if abs(norm_center_x - 0.5) > 0.20 or abs(norm_center_y - 0.5) > 0.20:
            directions = []
            if norm_center_x < 0.30:
                directions.append("Geser ke KANAN")
            elif norm_center_x > 0.70:
                directions.append("Geser ke KIRI")
            
            if norm_center_y < 0.30:
                directions.append("Geser ke BAWAH")
            elif norm_center_y > 0.70:
                directions.append("Geser ke ATAS")
                
            if directions:
                return {
                    "status": "reject",
                    "reason": f"Tangan tidak di tengah. Petunjuk: {', '.join(directions)}."
                }

        # 4. Extract ROI matching the exact hand bounding box displayed to the user
        # Ensure crop coordinates are within image boundaries
        crop_x_min = max(0, int(x_min))
        crop_y_min = max(0, int(y_min))
        crop_x_max = min(w, int(x_max))
        crop_y_max = min(h, int(y_max))
        
        # Crop the raw image using the tight bounding box
        cropped_roi = image[crop_y_min:crop_y_max, crop_x_min:crop_x_max]

        # Check if the cropped ROI is valid
        if cropped_roi.size == 0 or cropped_roi.shape[0] == 0 or cropped_roi.shape[1] == 0:
            return {
                "status": "reject",
                "reason": "Gagal mengekstrak area telapak tangan. Pastikan tangan Anda berjarak cukup dari kamera."
            }

        # 5. Check if the image is blurry (using the variance of Laplacian on the cropped ROI)
        gray_roi = cv2.cvtColor(cropped_roi, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
        # Threshold: 40.0 is relaxed to let standard webcams pass while blocking severe blur
        if laplacian_var < 40.0:
            return {
                "status": "reject",
                "reason": "Gambar blur. Tahan posisi tangan Anda dengan tenang."
            }

        # Convert landmarks to simple dict lists for JSON response or logging
        landmarks_list = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in landmarks]

        return {
            "status": "success",
            "masked_roi": cropped_roi,
            "landmarks": landmarks_list
        }
