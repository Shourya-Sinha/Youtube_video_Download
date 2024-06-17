import React, { useEffect, useRef, useState } from "react";
import {
  AppBar,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Box,
  Tooltip,
  Stack,
  useMediaQuery,
  createTheme,
  ThemeProvider,
  TextField,
  Button,
  Divider,
  Grid,
  Link,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  AccountCircle,
  FacebookOutlined,
  Instagram,
  More,
  RunningWithErrors,
  Security,
  SubscriptionsOutlined,
  Task,
  Twitter,
} from "@mui/icons-material";
import "./App.css";
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { useSnackbar } from "./SnackBarContext";

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  // Other theme configurations as needed
  // palette: {
  //   primary: blue,
  //   secondary: pink,
  // },
});

function CircularProgressWithLabel(props) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex'}}>
      <CircularProgress variant="determinate" {...props} aria-readonly />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="subtitle2" component="div">
          {`${Math.round(props.value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}

function App() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = React.useState(null);

  const currentYear = new Date().getFullYear();

  const isXsScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  // connect backend start 
  const [VideoLink, setVideoLink] = useState('');
  const [progress, setProgress] = useState(0);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [isDownloading, setIsDownloading] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const startTimeRef = useRef(0);
  const throttleTimeoutRef = useRef(null);
  const [completedCount, setCompletedCount] = useState(0);
const [inProgressCount, setInProgressCount] = useState(0);
const enqueueSnackbar = useSnackbar();

// const addError = (message) => {
//   const id = new Date().getTime(); // Use current timestamp as unique ID
//   setErrors((prevErrors) => [...prevErrors, { id, message }]);
// };

// const removeError = (id) => {
//   setErrors((prevErrors) => prevErrors.filter((error) => error.id !== id));
// };

useEffect(() => {
  const fetchCounts = async () => {
    try {
        // Replace with actual endpoint URL
        const response = await fetch('http://localhost:7000/download-counts');
        const data = await response.json();
        setCompletedCount(data.completedCount);
        setInProgressCount(data.inProgressCount);
    } catch (error) {
        console.error('Error fetching counts:', error);
        // setSnackbarMessage(`Error fetching counts: ${error.message}`);
        // setSnackbarSeverity('error');
        enqueueSnackbar(`Error fetching counts: ${error.message}`, 'error');
    }
};

// Call fetchCounts on component mount

  fetchCounts();
  const intervalId = setInterval(fetchCounts, 2000); // Poll every 5 seconds

  return () => clearInterval(intervalId); // Cleanup interval on unmount
}, []);

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (seconds) => {
  if (seconds < 60) {
      return seconds.toFixed(2) + ' seconds';
  } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = (seconds % 60).toFixed(2);
      return `${minutes} min ${remainingSeconds} sec`;
  }
};

const menuItems = [
  {
      label: 'File Served',
      count: completedCount,
      icon: <Task />,
      ariaLabel: `show ${completedCount} new mails`
  },
  {
      label: 'Worldwide Progress',
      count: inProgressCount,
      icon: <RunningWithErrors />,
      ariaLabel: `show ${inProgressCount} new notifications`
  }
];
let previousLoaded = 0;
let previousTime = Date.now();

const handleDownload = async () => {
  setIsDownloading(true);
  setProgress(0);
  setSpeed(0);
  setTimeRemaining(0);
  startTimeRef.current = performance.now();

  try {
      const response = await fetch('http://localhost:7000/download', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ VideoLink }),
      });

      if (!response.ok) {
          throw new Error('Failed to start download');
      }

      const reader = response.body.getReader();
      const contentLength = response.headers.get('Content-Length');
      let receivedLength = 0;
      const chunks = [];
      let prevTime = performance.now();

      while (true) {
          const { done, value } = await reader.read();

          if (done) {
              break;
          }

          chunks.push(value);
          receivedLength += value.length;
          setProgress((receivedLength / contentLength) * 100);

          const currentTime = performance.now();
          const elapsedTime = (currentTime - prevTime) / 1000; // in seconds
          const currentSpeed = (value.length/1024/1024) / elapsedTime; // bytes per second
          // setSpeed(currentSpeed);

          // const remainingTimeBytes = contentLength - receivedLength;
          // const remainingTime = remainingTimeBytes / (currentSpeed *1024*1024);
          // setTimeRemaining(remainingTime);
          // Throttle speed and time remaining updates
          if (!throttleTimeoutRef.current) {
            throttleTimeoutRef.current = setTimeout(() => {
                setSpeed(currentSpeed);
                const remainingBytes = contentLength - receivedLength;
                const remainingTime = remainingBytes / (currentSpeed * 1024 * 1024); // seconds
                setTimeRemaining(remainingTime);
                throttleTimeoutRef.current = null;
            }, 1000); // Adjust throttle delay as needed (e.g., 500ms)
        }

          prevTime = currentTime;
      }

      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      // Optional: Get the filename from the response headers if needed
      const filename = response.headers.get('Content-Disposition')
          ? response.headers.get('Content-Disposition').split('filename=')[1].replace(/"/g, '')
          : 'downloaded_video.mp4';
          
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // setSnackbarSeverity('success');
      // setSnackbarMessage('Download completed successfully!');
      // setOpenSnackbar(true);
      enqueueSnackbar('Download completed successfully!', 'success');
  } catch (error) {
      // setSnackbarSeverity('error');
      // setSnackbarMessage(`Error in url or flag to premium video: ${error.message}`);
      enqueueSnackbar(`Error: ${error.message}`, 'error');
  } finally {
      setIsDownloading(false);
      setSpeed(0);
      setTimeRemaining(0);
  }
};

// const handleCloseSnackbar = () => {
//   setOpenSnackbar(false);
// };


  // Backend end

  const menuId = "primary-search-account-menu";
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
      <MenuItem onClick={handleMenuClose}>My account</MenuItem>
    </Menu>
  );

  const mobileMenuId = "primary-search-account-menu-mobile";
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      {/* <MenuItem>
        <IconButton size="small" aria-label="show 4 new mails" color="inherit">
          <Badge badgeContent={completedCount} color="error">
            <Task />
          </Badge>
        </IconButton>
        <Typography variant="caption">File Served</Typography>
      </MenuItem>
      <MenuItem>
        <IconButton
          size="small"
          aria-label="show 17 new notifications"
          color="inherit"
        >
          <Badge badgeContent={inProgressCount} color="error">
            <RunningWithErrors />
          </Badge>
        </IconButton>
        <Typography variant="caption">Worldwide Progress</Typography>
      </MenuItem> */}
       {menuItems.map((item, index) => (
                <MenuItem key={index}>
                    <IconButton
                        size="small"
                        aria-label={item.ariaLabel}
                        color="inherit"
                    >
                        <Badge badgeContent={item.count} color="error">
                            {item.icon}
                        </Badge>
                    </IconButton>
                    <Typography variant="caption">{item.label}</Typography>
                </MenuItem>
            ))}
      <MenuItem onClick={handleProfileMenuOpen}>
        <IconButton
          size="small"
          aria-label="account of current user"
          aria-controls="primary-search-account-menu"
          aria-haspopup="true"
          color="inherit"
        >
          <AccountCircle />
        </IconButton>
        
      <Link href="https://quicksolve.tech" sx={{color:'inherit'}}> Parent Site </Link>
      </MenuItem>
    </Menu>
  );

  return (
    <ThemeProvider theme={theme}>
    {/* <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} variant="filled">
            {snackbarMessage}
        </Alert>
    </Snackbar> */}
     {/* {errors.map((error) => (
      <Snackbar
        key={error.id}
        open={true}
        autoHideDuration={6000}
        onClose={() => removeError(error.id)}
      >
        <Alert
          onClose={() => removeError(error.id)}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error.message}
        </Alert>
      </Snackbar>
    ))}

    <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
      <Alert
        onClose={handleCloseSnackbar}
        severity={snackbarSeverity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {snackbarMessage}
      </Alert>
    </Snackbar> */}
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="open drawer"
              sx={{ mr: 2 }}
            >
              <Menu />
            </IconButton>
            <Typography
              variant={isXsScreen ? "subtitle2" : "h6"}
              noWrap
              component="div"
              //sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              SavefromNet
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              <Stack direction="row" spacing={2} alignItems={"center"}>
              <Link href="https://quicksolve.tech" sx={{color:'inherit'}}> Parent Site </Link>
                <Typography variant="subtitle2">Instagram</Typography>
                <Typography variant="subtitle2">Facebook</Typography>
              </Stack>

              <IconButton
                size="large"
                aria-label="show 4 new mails"
                color="inherit"
              >
                <Badge badgeContent={completedCount} color="error">
                  <Tooltip title={"File Served"}>
                    <Task />
                  </Tooltip>
                </Badge>
              </IconButton>
              <IconButton
                size="large"
                aria-label="show 17 new notifications"
                color="inherit"
              >
                <Badge badgeContent={inProgressCount} color="error">
                  <Tooltip title={"Worldwide Processings"}>
                    <RunningWithErrors />
                  </Tooltip>
                </Badge>
              </IconButton>
              {/* <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton> */}
            </Box>
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <IconButton
                size="large"
                aria-label="show more"
                aria-controls={mobileMenuId}
                aria-haspopup="true"
                onClick={handleMobileMenuOpen}
                color="inherit"
              >
                <More />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
        {renderMobileMenu}
        {renderMenu}

        {/* Home Page */}

        <Box sx={{ mt: 4 }}>
          <Typography variant={isXsScreen ? "subtitle2" : "h6"}>
            Free Online Youtube Video Downloader
          </Typography>

          <Stack spacing={1}>
          <TextField
        placeholder="Paste Youtube Video Link"
        value={VideoLink}
        type="text"
        onChange={(e) => setVideoLink(e.target.value)}
        disabled={isDownloading}
    />
            <Stack direction={"row"} alignItems={"center"}>
              <Typography variant="caption" lineHeight={0}>
                {" "}
                By using our service you accept our Terms of Service and Privacy
                Policy
              </Typography>
            </Stack>
            <Stack sx={{py:2}} direction={'row'} justifyContent={'space-between'}>
              {/* {
                downloadProgress > 0 && downloadProgress < 100 && <Typography>Progress : {`${downloadProgress}%`}</Typography>
              } */}
              {/* <Typography>Progress : {`${downloadProgress}%`}</Typography> */}
              <Stack direction={'row'} alignItems={'center'}>
              <Typography>Progress : </Typography>
              <CircularProgressWithLabel value={progress} />
              </Stack>
             
              
            
            <Typography>Download speed:{formatBytes(speed * 1024 * 1024)}/s </Typography>
            <Typography>Estimated time remaining: {formatTime(timeRemaining)}</Typography>
            </Stack>

            <Stack sx={{ paddingTop:5, paddingBottom:3 }}>
            <Button onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? 'Downloading...' : 'Download'}
    </Button>
            </Stack>
          </Stack>

          <Stack
            direction={"row"}
            alignItems={"center"}
            spacing={1}
            justifyContent={"center"}
            mt={2}
          >
            <Typography variant="subtitle2">Scanned By Nortan </Typography>
            <Security color="primary" />
            <Typography variant="subtitle2">Safe Web</Typography>
          </Stack>
          <Stack sx={{ marginTop: 2 }}>
            <Typography
              variant={isXsScreen ? "subtitle2" : "h5"}
              sx={{ placeItems: "center" }}
            >
              All Resources
            </Typography>

            <Stack
              direction={"row"}
              justifyContent={"space-between"}
              sx={{ marginTop: 2 }}
            >
              <IconButton sx={{border:'1px solid black'}}>
                <FacebookOutlined color="primary" />
              </IconButton>
              <IconButton>
                <SubscriptionsOutlined color="primary" />
              </IconButton>
              <IconButton>
                <Twitter color="primary" />
              </IconButton>
              <IconButton>
                <Instagram color="primary" />
              </IconButton>
            </Stack>
          </Stack>

          <Stack sx={{ marginTop: 4 }}>
            <Typography variant={isXsScreen ? "h6" : "h5"}>
              Guide to Using SaveFromNet's Online Video Downloader{" "}
            </Typography>
            <Stack
              sx={{ maxWidth: 1000, margin: "0 auto 0 auto" }}
              paddingTop={2}
            >
              <Typography sx={{ textAlign: 'justify'}} variant={isXsScreen ? "subtitle2" : "body2"}>
                Effortlessly download videos and music using SaveFrom.Net, the
                premier Online Video Downloader. Secure your favorite media
                directly from the web without any additional software. Our
                intuitive platform makes downloading videos straightforward and
                efficient. Easily access and download a diverse range of
                content, from blockbuster movies and popular TV series to
                thrilling sports clips. Simply paste the video URL into the
                designated field and click the Download button. For even quicker
                downloads, consider adding our specialized Chrome extension to
                your browser.
              </Typography>
            </Stack>

            <Typography variant={isXsScreen ? "h6" : "h5"} paddingTop={2}>
              Download Videos in Premium MP4 Quality
            </Typography>
            <Stack
              sx={{ textWrap: "wrap", maxWidth: 1000, margin: "0 auto 0 auto" }}
              paddingTop={2}
            >
              <Typography sx={{ textAlign: 'justify'}} variant={isXsScreen ? "subtitle2" : "body2"}>
                While streaming videos online with a high-speed connection
                offers instant gratification, don't overlook the advantages of
                offline playback. SaveFrom.Net provides a powerful video
                downloader that ensures your downloads maintain high visual
                quality, enabling you to save videos in crisp, high-definition
                MP4 format. With our reliable service, you can enjoy your
                favorite videos anytime and anywhere by converting and saving
                them as high-quality HD MP4 files.
              </Typography>
            </Stack>
          </Stack>

          {/* Footer */}
          <Stack sx={{ width: "100%", my: 4 }}>
            <Divider orientation="horizontal" />
            <Grid container>
              <Grid item xs={12} sm={4} lg={4} md={4} xl={4} sx={{mb:3}}>
                <Stack>
                  <Typography variant="h6">SaveFromNet.com</Typography>
                  <Typography>2024 - &copy; {currentYear}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={4} lg={4} md={4} xl={4} sx={{mb:3}}>
                <Stack spacing={0.2}>
                  <Typography variant={isXsScreen ? "subtitle2" : "h5"}>
                    Working On
                  </Typography>
                  <Typography>Youtube Shorts</Typography>
                  <Typography>Youtube to Mp3</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={4} lg={4} md={4} xl={4} sx={{mb:2}}>
                <Stack spacing={0.2}>
                  <Typography variant={isXsScreen ? "subtitle2" : "h5"}>
                    Suggestion
                  </Typography>
                  <Typography>For any suggestion email us</Typography>
                  <Typography>shouryasinha.c@gmail.com</Typography>
                  <Typography>+91 7488348576</Typography>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
          <Stack sx={{ mt: 4 }}>
            <Divider orientation="horizontal" />
            <Typography variant={"caption"}>MADE BY - SHOURYA SINHA</Typography>
          </Stack>
         
        </Box>
        {/* <ToastContainer /> */}
      </Box>
     
    </ThemeProvider>
  );
}

export default App;
