# Pavlov Server Manager
### ***Note:** this it intended for legacy servers but, should be mostly compatible with current servers*  
A simple node.js base management console for pavlov servers  
Uses RCon to connect to the server and host simple web site with server controls  
by default the web server is hosted at `http://127.0.0.1:8080` and attempts to use port `15777` for RCon connections (*this is NOT the default port*)  
This also has a simple Steam workshop browser that allows downloading and playing modded maps (*this only works on legacy servers*)

## Usage
1. Install node.js (v12 or greater)  
2. Clone/download the repo  
3. Install node dependencies using `npm i`  
4. Create a `.env` file bases on the `.env.sample` file located in the root directory   
5. Run `npm run start` from the project root directory 
6. Open a browser window to `http://127.0.0.1:8080`
  
*This is a simple side project that will have bugs and will not be frequently updated*
