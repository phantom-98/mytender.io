import React from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { Spinner } from "react-bootstrap";

interface EllipsisMenuProps {
  filename: string;
  unique_id: string;
  onDelete: () => void;
  availableFolders: string[];
  currentFolder: string;
  onMove: (newFolder: string) => void;
  // Add isMoving state
  isMoving?: boolean;
}

const EllipsisMenu: React.FC<EllipsisMenuProps> = ({
  filename,
  unique_id,
  onDelete,
  availableFolders,
  currentFolder,
  onMove,
  isMoving = false // Default to false
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [showMoveMenu, setShowMoveMenu] = React.useState<null | HTMLElement>(
    null
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setShowMoveMenu(null);
  };

  const handleDeleteClick = () => {
    onDelete();
    handleClose();
  };

  const handleMoveClick = (event: React.MouseEvent<HTMLElement>) => {
    setShowMoveMenu(event.currentTarget);
  };

  const handleMoveToFolder = (folder: string) => {
    onMove(folder);
    handleClose();
  };

  // Filter out current folder from available folders and sort alphabetically
  const availableDestinations = availableFolders
    .filter((folder) => folder !== currentFolder)
    .sort((a, b) => {
      // Put "default" folder first
      if (a === "default") return -1;
      if (b === "default") return 1;
      // Otherwise sort alphabetically
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });

  return (
    <div>
      {isMoving ? (
        <div className="spinner-button me-1">
          <Spinner
            animation="border"
            style={{ width: "25px", height: "25px" }}
          />
        </div>
      ) : (
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
          <FontAwesomeIcon
            icon={faEllipsisVertical}
            className="ellipsis-icon"
          />
        </Button>
      )}
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            width: "150px"
          }
        }}
      >
        <MenuItem
          onClick={handleMoveClick}
          className="styled-menu-item"
          aria-controls="move-menu"
          aria-haspopup="true"
        >
          <i className="fas fa-arrow-right styled-menu-item-icon"></i>
          Move to
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} className="styled-menu-item">
          <i className="fas fa-trash-alt styled-menu-item-icon"></i>
          Delete File
        </MenuItem>
      </Menu>
      <Menu
        id="move-menu"
        anchorEl={showMoveMenu}
        keepMounted
        open={Boolean(showMoveMenu)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
      >
        {availableDestinations.map((folder) => (
          <MenuItem
            key={folder}
            onClick={() => handleMoveToFolder(folder)}
            className="styled-menu-item"
          >
            <i className="fas fa-folder styled-menu-item-icon"></i>
            {folder === "default"
              ? "Whole Content Library"
              : folder.replace(/FORWARDSLASH/g, "/")}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
};

export default EllipsisMenu;
