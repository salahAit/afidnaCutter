#!/bin/bash

# Configuration
SERVER_IP="5.182.17.229"
SERVER_USER="root"
SSH_KEY="./ssh_key"
WEB_DIR="/var/www/html"

# Version argument, default to 1.0.0
VERSION=${1:-"1.0.0"}
FILENAME="Afidna_Cutter_Setup_${VERSION}.zip"
FILE_PATH="release/${FILENAME}"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File $FILE_PATH not found!"
    exit 1
fi

# Fix permissions for key if needed
chmod 600 "$SSH_KEY"

# Check if remote web dir exists
echo "Checking for web directory on server..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "[ -d $WEB_DIR ]"
if [ $? -eq 0 ]; then
    DEST_DIR="$WEB_DIR"
    LINK_MSG="Download Link: http://$SERVER_IP/$FILENAME"
else
    echo "Web directory $WEB_DIR not found. Falling back to home directory."
    DEST_DIR="~"
    LINK_MSG="File uploaded to home directory. You need to move it to a web-accessible folder to share it."
fi

echo "Deploying $FILENAME to $SERVER_USER@$SERVER_IP:$DEST_DIR..."

# Try rsync first, if it fails (missing on server or network error), fallback to scp
if ! rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no -i $SSH_KEY" "$FILE_PATH" "$SERVER_USER@$SERVER_IP:$DEST_DIR"; then
    echo "Rsync failed! Falling back to SCP..."
    scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "$FILE_PATH" "$SERVER_USER@$SERVER_IP:$DEST_DIR"
fi

# Check if upload (either rsync or scp) was successful
if [ $? -eq 0 ]; then
    # CRITICAL: Fix permissions so Nginx can serve the file
    echo "Fixing permissions for zip file..."
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "chmod 644 $DEST_DIR/$FILENAME"
    
    # Upload Guide Files
    echo "Deploying Guide Page..."
    GUIDE_FILES="guide.html guide-logo.webp app-screenshot.png"
    
    if command -v rsync >/dev/null 2>&1; then
        rsync -avz -e "ssh -o StrictHostKeyChecking=no -i $SSH_KEY" $GUIDE_FILES "$SERVER_USER@$SERVER_IP:$DEST_DIR"
    else
        scp -o StrictHostKeyChecking=no -i "$SSH_KEY" $GUIDE_FILES "$SERVER_USER@$SERVER_IP:$DEST_DIR"
    fi
    
    # Fix permissions for guide files
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "chmod 644 $DEST_DIR/guide.html $DEST_DIR/guide-logo.webp $DEST_DIR/app-screenshot.png"

    echo "-----------------------------------"
    echo "Upload successful!"
    echo "$LINK_MSG"
    echo "Guide Page: http://$SERVER_IP/guide.html"
    echo "-----------------------------------"
else
    echo "Upload failed completely."
    exit 1
fi
