import React, { useState, useEffect, useRef } from "react";
import { useAuthUser } from "react-auth-kit";
import axios from "axios";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import { Link } from "react-router-dom";
import "./Bids.css";
import { useNavigate } from "react-router-dom";
import SideBarSmall from "../routes/SidebarSmall.tsx";
import handleGAEvent from "../utilities/handleGAEvent.tsx";
import { Button, Form, Modal } from "react-bootstrap";
import { displayAlert } from "../helper/Alert.tsx";
import {
  faPlus,
  faSort,
  faSortDown,
  faSortUp,
  faTrash
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Select, MenuItem, FormControl, Skeleton } from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { styled } from "@mui/material/styles";
import withAuth from "../routes/withAuth.tsx";

const Bids = () => {
  const [bids, setBids] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [bidName, setBidName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bidToDelete, setBidToDelete] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");
  const navigate = useNavigate();

  // Sorting bids based on the selected criteria
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "timestamp",
    direction: "desc"
  } as const);

  interface Bid {
    _id: string;
    bid_title: string;
    status: "ongoing" | "complete";
    timestamp?: string;
    submission_deadline?: string;
    client_name?: string;
    bid_manager?: string;
    opportunity_owner?: string;
    bid_qualification_result?: string;
    [key: string]: string | undefined; // Index signature for dynamic access
  }

  interface SortConfig {
    key: keyof Bid;
    direction: "asc" | "desc";
  }

  interface StyledSelectProps {
    status?: "ongoing" | "complete";
  }

  interface ApiResponse {
    status: string;
    data?: {
      detail?: string;
    };
  }

  interface ModalSubmitEvent extends React.FormEvent<HTMLFormElement> {
    preventDefault(): void;
  }

  const sortData = (data: Bid[], sortConfig: SortConfig): Bid[] => {
    const sortedData = [...data].sort((a: Bid, b: Bid) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Helper function to check if value is empty
      const isEmpty = (value: unknown): boolean => {
        return (
          value === null ||
          value === undefined ||
          value === "" ||
          String(value).trim() === ""
        );
      };

      // Always put empty values at the end
      if (isEmpty(aValue) && !isEmpty(bValue)) return 1;
      if (!isEmpty(aValue) && isEmpty(bValue)) return -1;
      if (isEmpty(aValue) && isEmpty(bValue)) return 0;

      let comparison = 0;
      switch (sortConfig.key) {
        case "timestamp":
        case "submission_deadline":
          const dateA = new Date(aValue as string);
          const dateB = new Date(bValue as string);
          const isValidDateA = !isNaN(dateA.getTime());
          const isValidDateB = !isNaN(dateB.getTime());

          if (!isValidDateA && isValidDateB) return 1;
          if (isValidDateA && !isValidDateB) return -1;
          if (!isValidDateA && !isValidDateB) return 0;

          comparison = dateA.getTime() - dateB.getTime();
          break;

        case "status":
          comparison = String(aValue)
            .toLowerCase()
            .localeCompare(String(bValue).toLowerCase());
          break;

        default:
          comparison = String(aValue)
            .toLowerCase()
            .localeCompare(String(bValue).toLowerCase());
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return sortedData;
  };

  const requestSort = (key: keyof Bid): void => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: keyof Bid): JSX.Element => {
    if (sortConfig.key !== columnKey) {
      return <FontAwesomeIcon icon={faSort} />;
    }
    return sortConfig.direction === "asc" ? (
      <FontAwesomeIcon icon={faSortUp} />
    ) : (
      <FontAwesomeIcon icon={faSortDown} />
    );
  };
  // Update the table header to include sorting
  const headers = [
    { key: "bid_title", label: "Tender Name", width: "18%" },
    { key: "timestamp", label: "Last edited" },
    { key: "status", label: "Status" },
    { key: "client_name", label: "Client" },
    { key: "submission_deadline", label: "Deadline", width: "10%" },
    { key: "bid_manager", label: "Bid Manager", width: "15%" },
    { key: "opportunity_owner", label: "Opportunity Owner", width: "15%" },
    { key: "bid_qualification_result", label: "Result" }
  ];
  // Sort the bids before pagination
  const sortedBids = sortData(bids, sortConfig);

  const [currentPage, setCurrentPage] = useState(1);
  const bidsPerPage = 11;

  // Calculate the current bids to display
  const indexOfLastBid = currentPage * bidsPerPage;
  const indexOfFirstBid = indexOfLastBid - bidsPerPage;
  const currentBids = sortedBids.slice(indexOfFirstBid, indexOfLastBid);

  // Change page
  const paginate = (pageNumber: React.SetStateAction<number>) =>
    setCurrentPage(pageNumber);

  const navigateToChatbot = (bid: any) => {
    localStorage.setItem("navigatedFromBidsTable", "true");
    localStorage.removeItem("bidState");
    navigate("/bid-extractor", { state: { bid: bid, fromBidsTable: true } });
    handleGAEvent("Bid Tracker", "Navigate to Bid", "Bid Table Link");
  };

  const StyledSelect = styled(
    Select<"ongoing" | "complete">
  )<StyledSelectProps>(({ status }) => ({
    fontFamily: '"Manrope", sans-serif',
    fontWeight: "bold",
    fontSize: "14px",
    padding: "5px 10px",
    borderRadius: "5px",
    width: "140px",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    backgroundColor: status === "ongoing" ? "orange" : "black",

    "& .MuiSelect-select": {
      padding: "2px 2px"
    },
    "& .MuiOutlinedInput-notchedOutline": {
      border: "none"
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      border: "none"
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      border: "none"
    },
    "& .MuiSvgIcon-root": {
      color: status === "ongoing" ? "inherit" : "#fff"
    }
  }));

  const StyledMenuItem = styled(MenuItem)({
    fontFamily: '"Manropens-serif',
    fontSize: "14px"
  });

  const fetchBids = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/get_bids_list/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
          }
        }
      );
      if (response.data && response.data.bids) {
        setBids(response.data.bids);
      }
    } catch (error) {
      console.error("Error fetching bids:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
    localStorage.removeItem("lastActiveBid");
  }, []);

  const confirmDeleteBid = async () => {
    if (bidToDelete) {
      const formData = new FormData();
      formData.append("bid_id", bidToDelete);
      try {
        const response = await axios.post(
          `http${HTTP_PREFIX}://${API_URL}/delete_bid/`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
              "Content-Type": "multipart/form-data"
            }
          }
        );
        if (response.data && response.data.status === "success") {
          fetchBids();
          handleGAEvent("Bid Tracker", "Delete Bid", "Delete Bid Button");
        } else {
          displayAlert("Failed to delete bid", "error");
        }
      } catch (err) {
        // Type guard to check if error is AxiosError
        if (axios.isAxiosError(err)) {
          console.error("Error deleting bid:", err);

          if (err.response) {
            if (err.response.status === 403) {
              displayAlert(
                "Only admins can delete bids. You don't have permission to delete this bid",
                "danger"
              );
            } else if (err.response.status === 404) {
              displayAlert("Bid not found", "danger");
            } else {
              displayAlert(
                `Error: ${err.response.data.detail || "Failed to delete bid"}`,
                "danger"
              );
            }
          } else if (err.request) {
            displayAlert(
              "No response received from server. Please try again.",
              "danger"
            );
          }
        } else {
          // Handle non-Axios errors
          console.error("Non-Axios error:", err);
          displayAlert("Error deleting bid. Please try again.", "danger");
        }
      } finally {
        setShowDeleteModal(false);
      }
    }
  };

  const handleDeleteClick = (bidId: string): void => {
    setBidToDelete(bidId);
    setShowDeleteModal(true);
  };

  const updateBidStatus = async (
    bidId: string,
    newStatus: "ongoing" | "complete"
  ): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append("bid_id", bidId);
      formData.append("status", newStatus);

      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/update_bid_status/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      if (
        response.data &&
        (response.data as ApiResponse).status === "success"
      ) {
        handleGAEvent(
          "Bid Tracker",
          "Change Bid Status",
          "Bid Status Dropdown"
        );
        setTimeout(fetchBids, 500);
      } else {
        displayAlert("Failed to update bid status", "danger");
      }
    } catch (err) {
      console.error("Error updating bid status:", err);

      if (axios.isAxiosError(err)) {
        if (err.response) {
          if (err.response.status === 403) {
            displayAlert(
              "You are a viewer. You don't have permission to update this bid's status",
              "danger"
            );
          } else if (err.response.status === 404) {
            displayAlert("Bid not found", "error");
          } else {
            displayAlert(
              `Error: ${err.response.data?.detail || "Failed to update bid status"}`,
              "danger"
            );
          }
        } else if (err.request) {
          displayAlert(
            "No response received from server. Please try again.",
            "danger"
          );
        }
      } else {
        displayAlert("Error updating bid status. Please try again.", "danger");
      }
    }
  };

  const handleWriteProposalClick = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setBidName("");
  };

  const handleOngoingSidebarLinkClick = () => {
    handleGAEvent(
      "Sidebar Navigation",
      "Ongoing Link Click",
      "ongoing link nav"
    );
  };

  const handleModalSubmit = (e: ModalSubmitEvent): void => {
    e.preventDefault();
    if (!bidName) {
      displayAlert("Bid name cannot be empty", "danger");
      return;
    }
    if (bidName.length > 80) {
      displayAlert("Bid name cannot exceed 80 characters", "danger");
      return;
    }
    if (bids.some((bid: Bid) => bid.bid_title === bidName)) {
      displayAlert("Bid name already exists", "danger");
      return;
    }

    localStorage.removeItem("bidInfo");
    localStorage.removeItem("backgroundInfo");
    localStorage.removeItem("response");
    localStorage.removeItem("inputText");
    localStorage.removeItem("editorState");
    localStorage.removeItem("messages");
    localStorage.removeItem("bidState");

    handleOngoingSidebarLinkClick();
    navigate("/bid-extractor", { state: { bidName } });
    setShowModal(false);
  };

  const SkeletonRow = () => (
    <tr className="py-4">
      <td>
        <Skeleton variant="text" width="100%" />
      </td>
      <td>
        <Skeleton variant="text" width="100%" />
      </td>
      <td>
        <Skeleton variant="text" width="100%" />
      </td>
      <td>
        <Skeleton variant="text" width="100%" />
      </td>
      <td>
        <Skeleton variant="text" width="100%" />
      </td>
      <td>
        <Skeleton variant="text" width="100%" />
      </td>
      <td>
        <Skeleton variant="text" width="100%" />
      </td>
      <td>
        <Skeleton variant="text" width="100%" />
      </td>
      <td style={{ textAlign: "center" }}>
        <Skeleton
          variant="rounded"
          width={20}
          height={20}
          style={{ marginLeft: "22px" }}
        />
      </td>
    </tr>
  );

  return (
    <div>
      <SideBarSmall />

      <div className="lib-container">
        <div className="scroll-container">
          <div className="proposal-header">
            <h1 id="dashboard-title">Tender Dashboard</h1>
            <div style={{ display: "flex" }}>
              <Button
                onClick={handleWriteProposalClick}
                className="upload-button"
                id="new-bid-button"
              >
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: "8px" }} />
                New Tender
              </Button>
              <label></label>
            </div>
          </div>

          <table className="bids-table mt-1">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th
                    key={header.key}
                    style={{ width: header.width, cursor: "pointer" }}
                    onClick={() => requestSort(header.key)}
                    className="sortable-header"
                  >
                    {header.label}
                    {getSortIcon(header.key)}
                  </th>
                ))}
                <th style={{ textAlign: "center", width: "5%" }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(14)].map((_, index) => <SkeletonRow key={index} />)
                : currentBids.map((bid, index) => (
                    <tr key={index}>
                      <td>
                        <Link
                          to="/bid-extractor"
                          state={{ bid: bid, fromBidsTable: true }}
                          onClick={() => navigateToChatbot(bid)}
                        >
                          {bid.bid_title}
                        </Link>
                      </td>
                      <td>
                        {bid.timestamp
                          ? new Date(bid.timestamp).toLocaleDateString()
                          : ""}
                      </td>
                      <td>
                        <FormControl fullWidth>
                          <StyledSelect
                            value={
                              bid.status.toLowerCase() as "ongoing" | "complete"
                            }
                            onChange={(
                              e: SelectChangeEvent<"ongoing" | "complete">
                            ) => {
                              // Type guard to ensure value is either "ongoing" or "complete"
                              if (
                                e.target.value === "ongoing" ||
                                e.target.value === "complete"
                              ) {
                                updateBidStatus(bid._id, e.target.value);
                              }
                            }}
                            className={`status-dropdown ${bid.status.toLowerCase()}`}
                            status={
                              bid.status.toLowerCase() as "ongoing" | "complete"
                            }
                          >
                            <StyledMenuItem value="ongoing">
                              Ongoing
                            </StyledMenuItem>
                            <StyledMenuItem value="complete">
                              Complete
                            </StyledMenuItem>
                          </StyledSelect>
                        </FormControl>
                      </td>
                      <td>{bid.client_name}</td>
                      <td>
                        {bid.submission_deadline &&
                        !isNaN(Date.parse(bid.submission_deadline))
                          ? new Date(
                              bid.submission_deadline
                            ).toLocaleDateString()
                          : ""}
                      </td>
                      <td>{bid.bid_manager}</td>
                      <td>{bid.opportunity_owner}</td>
                      <td>{bid.bid_qualification_result || ""}</td>
                      <td style={{ textAlign: "center" }}>
                        <FontAwesomeIcon
                          icon={faTrash}
                          onClick={() => handleDeleteClick(bid._id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <div className="pagination-container">
            {[...Array(Math.ceil(sortedBids.length / bidsPerPage))].map(
              (_, index) => (
                <button
                  key={index + 1}
                  className={`pagination-button ${currentPage === index + 1 ? "active" : ""}`}
                  onClick={() => paginate(index + 1)}
                >
                  {index + 1}
                </button>
              )
            )}
          </div>
          {/* <DashboardWizard /> */}
        </div>
        <Modal
          show={showModal}
          onHide={handleModalClose}
          className="custom-modal-newbid"
        >
          <Modal.Header className="px-4">
            <Modal.Title>Enter Tender Name</Modal.Title>
            <button className="close-button ms-auto" onClick={handleModalClose}>
              ×
            </button>
          </Modal.Header>
          <Modal.Body className="px-4 py-4" style={{ height: "14vh" }}>
            <div className="content-scaler">
              <Form onSubmit={handleModalSubmit}>
                <div className="search-input-group">
                  <Form.Control
                    type="text"
                    value={bidName}
                    onChange={(e) => setBidName(e.target.value)}
                    placeholder="Enter tender name"
                    maxLength={80}
                    className="form-control"
                  />
                  <Button type="submit" className="search-button">
                    Submit
                  </Button>
                </div>
              </Form>
            </div>
          </Modal.Body>
        </Modal>

        <Modal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          className=""
        >
          <Modal.Header closeButton className="py-3 px-4">
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body className="px-4 py-4" style={{ height: "12vh" }}>
            Are you sure you want to delete this tender?
          </Modal.Body>
          <Modal.Footer>
            <div className="">
              <Button
                className="upload-button"
                style={{ backgroundColor: "red" }}
                onClick={confirmDeleteBid}
              >
                Delete
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default withAuth(Bids);
