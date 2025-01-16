import React from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";

interface ComplianceEllipsisMenuProps {
  onDelete: () => void;
}

const ComplianceEllipsisMenu: React.FC<ComplianceEllipsisMenuProps> = ({
  onDelete
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    onDelete();
    handleClose();
  };

  const handleViewClick = () => {
    handleClose();
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
        <MenuItem onClick={handleViewClick} className="styled-menu-item">
          <i className="fas fa-trash-alt styled-menu-item-icon"></i>
          View
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} className="styled-menu-item">
          <i className="fas fa-trash-alt styled-menu-item-icon"></i>
          Delete
        </MenuItem>
      </Menu>
    </div>
  );
};

export default ComplianceEllipsisMenu;
