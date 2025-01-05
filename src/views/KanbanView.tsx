import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faMoneyBill } from "@fortawesome/free-solid-svg-icons";
import "./KanbanView.css";

interface KanbanViewProps {
  bids: any[];
  updateBidStatus: (bidId: string, newStatus: string) => Promise<void>;
  navigateToChatbot: (bid: any) => void;
}

const statusColumns = [
  "Identification",
  "Capture Planning",
  "First Review",
  "Final Review",
  "Submitted"
];

const KanbanView: React.FC<KanbanViewProps> = ({
  bids,
  updateBidStatus,
  navigateToChatbot
}) => {
  const [localBids, setLocalBids] = useState(bids);
  const draggedBidRef = useRef<any>(null);
  const bidsRef = useRef(localBids);

  useEffect(() => {
    // Only update if we're not in the middle of a drag
    if (!draggedBidRef.current) {
      setLocalBids(bids);
      bidsRef.current = bids;
    }
  }, [bids]);

  const getBidsForStatus = useCallback(
    (status: string) => {
      if (status === "Identification") {
        return bidsRef.current.filter(
          (bid) => bid.status === status || !statusColumns.includes(bid.status)
        );
      }
      return bidsRef.current.filter((bid) => bid.status === status);
    },
    [bidsRef.current]
  );

  const handleDragStart = (e: React.DragEvent, bid: any) => {
    draggedBidRef.current = bid;
    const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.position = "absolute";
    ghost.style.top = "-1000px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    const draggedBid = draggedBidRef.current;
    if (!draggedBid || draggedBid.status === newStatus) {
      draggedBidRef.current = null;
      return;
    }

    // Update the ref immediately
    bidsRef.current = bidsRef.current.map((bid) =>
      bid._id === draggedBid._id
        ? {
            ...bid,
            status: newStatus
          }
        : bid
    );

    // Update state after ref
    setLocalBids(bidsRef.current);

    try {
      await updateBidStatus(draggedBid._id, newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert both ref and state on failure
      bidsRef.current = bidsRef.current.map((bid) =>
        bid._id === draggedBid._id
          ? {
              ...bid,
              status: draggedBid.status
            }
          : bid
      );
      setLocalBids(bidsRef.current);
    } finally {
      draggedBidRef.current = null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  const DraggableCard = ({ bid }: { bid: any }) => {
    const [isDragging, setIsDragging] = useState(false);

    return (
      <div
        draggable
        className={`kanban-card ${isDragging ? "is-dragging" : ""}`}
        onDragStart={(e) => {
          handleDragStart(e, bid);
          setIsDragging(true);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          if (!draggedBidRef.current) {
            bidsRef.current = bids;
            setLocalBids(bids);
          }
        }}
        onClick={() => !isDragging && navigateToChatbot(bid)}
      >
        <h3 className="bid-title">{bid.bid_title}</h3>
        <div className="bid-details">
          {bid.value && (
            <div className="bid-detail">
              <FontAwesomeIcon icon={faMoneyBill} />
              <span>{bid.value}</span>
            </div>
          )}
          {bid.submission_deadline && (
            <div className="bid-detail">
              <FontAwesomeIcon icon={faCalendarAlt} />
              <span>{formatDate(bid.submission_deadline)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="kanban-container">
      {statusColumns.map((status) => (
        <div key={status} className="kanban-column">
          <div className="kanban-column-header">
            <h2>{status}</h2>
            <span className="bid-count">{getBidsForStatus(status).length}</span>
          </div>
          <div
            className="kanban-list"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {getBidsForStatus(status).map((bid) => (
              <DraggableCard key={bid._id} bid={bid} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanView;
