import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Link } from "react-router-dom";
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
  const getBidsForStatus = (status: string) => {
    if (status === "Identification") {
      // For Identification, include both matching bids and those with invalid statuses
      return bids.filter(
        (bid) => bid.status === status || !statusColumns.includes(bid.status)
      );
    }
    return bids.filter((bid) => bid.status === status);
  };

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Update the bid's status in the backend
    const newStatus = destination.droppableId;
    const bidId = draggableId;
    updateBidStatus(bidId, newStatus);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="kanban-container">
        {statusColumns.map((status) => (
          <div key={status} className="kanban-column">
            <div className="kanban-column-header">
              <h2>{status}</h2>
              <span className="bid-count">
                {getBidsForStatus(status).length}
              </span>
            </div>
            <Droppable droppableId={status}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="kanban-list"
                >
                  {getBidsForStatus(status).map((bid, index) => (
                    <Draggable
                      key={bid._id}
                      draggableId={bid._id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="kanban-card"
                          onClick={() => navigateToChatbot(bid)}
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
                                <span>
                                  {formatDate(bid.submission_deadline)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanView;
