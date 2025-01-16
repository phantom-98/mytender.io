import React from "react";
import { Card, CardContent, Typography, Avatar, Grid } from "@mui/material";
import sidebarIcon from "../resources/images/mytender.io_badge.png";

const VideoCard = ({ videoUrl, videoTitle, channelName, views, time }) => {
  console.log("Video URL:", videoUrl); // Debugging step

  return (
    <Card
      sx={{
        maxWidth: "100%",
        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
        border: "1px solid #ced4da"
      }}
    >
      <video width="100%" controls>
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <CardContent>
        <Grid container alignItems="center">
          <Grid item>
            <Avatar
              alt="Channel Icon"
              src={sidebarIcon}
              sx={{
                width: 55,
                height: 55,
                bgcolor: "white",
                p: 0.8,
                py: 0.5
              }}
            />
          </Grid>
          <Grid item sx={{ ml: 1 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontFamily: "Manrope",
                marginBottom: "-5px",
                fontWeight: "600"
              }}
            >
              {channelName}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: "Manrope", mt: 0, fontWeight: "550" }}
            >
              {views}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default VideoCard;
