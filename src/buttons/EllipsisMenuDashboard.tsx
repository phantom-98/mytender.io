import React, { useState } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";

interface EllipsisMenuDashboardProps {
  onClick: () => void;
}

const EllipsisMenuDashboard: React.FC<EllipsisMenuDashboardProps> = ({
  onClick
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    handleClose();
    onClick();
  };

  return (
    <div>
      <Button
        aria-controls="simple-menu"
        aria-haspopup="true"
        onClick={handleClick}
        sx={{
          borderRadius: "50%",
          minWidth: 0,
          padding: "10px",
          backgroundColor: "transparent",
          "&.MuiButton-root:active": {
            boxShadow: "none"
          }
        }}
        className="ellipsis-button"
      >
        <FontAwesomeIcon icon={faEllipsisVertical} className="ellipsis-icon" />
      </Button>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            width: "120px"
          }
        }}
      >
        <MenuItem onClick={handleDeleteClick} className="styled-menu-item">
          <i className="fas fa-trash-alt styled-menu-item-icon"></i>
          Delete Bid
        </MenuItem>
      </Menu>
    </div>
  );
};

export default EllipsisMenuDashboard;
