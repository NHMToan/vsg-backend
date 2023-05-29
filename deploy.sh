echo "Deploying files to server..."
scp -r dist/* root@45.32.100.27:/var/www/vsg-backend/dist

echo "Done!"