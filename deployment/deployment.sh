curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
source ~/.bashrc
nvm install 8.9
sudo mkdir /opt/lightwatch
sudo chown ubuntu:ubuntu /opt/lightwatch
cd /opt/lightwatch
git clone https://github.com/jdotpy/protect-the-light.git
cd protect-the-light
npm install
npm run start
