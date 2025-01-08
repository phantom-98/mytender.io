import React, { useContext, useEffect, useRef, useState } from "react";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import axios from "axios";
import withAuth from "../routes/withAuth";
import { useAuthUser } from "react-auth-kit";
import SideBarSmall from "../routes/SidebarSmall.tsx";
import BidNavbar from "../routes/BidNavbar.tsx";
import {
  BidContext,
  Section,
  Subheading
} from "./BidWritingStateManagerView.tsx";
import { displayAlert } from "../helper/Alert.tsx";
import "./ComplianceMatrix.css";
import { Link, useNavigate } from "react-router-dom";

import './ComplianceMatrix.css';
import ComplianceEllipsisMenu from "../buttons/ComplianceEllipsisMenu.tsx";

const ComplianceMatrix = () => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const navigate = useNavigate();
  const tokenRef = useRef(auth?.token || "default");
  const { sharedState, setSharedState } = useContext(BidContext);
  const [isLoading, setIsLoading] = useState(false);


  const { object_id, contributors, outline } = sharedState;

  const currentUserPermission = contributors[auth.email] || "viewer";
  const [showModal, setShowModal] = useState(false);


  useEffect(() => {
    fetchOutline();
  }, []);


  const showViewOnlyMessage = () => {
    displayAlert("You only have permission to view this bid.", "danger");
  };

  useEffect(() => {
    if (outline.length === 0) {
      setShowModal(true);
    }
  }, [outline.length]);

  const fetchOutline = async () => {
    if (!object_id) return;
    const formData = new FormData();
    formData.append("bid_id", object_id);
    setIsLoading(true);
    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/get_bid_outline`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      const outlineWithStatus = response.data.map((section: any) => ({
        ...section,
        status:
          section.status ||
          (section.completed
            ? "Completed"
            : section.in_progress
              ? "In Progress"
              : "Not Started")
      }));

      setSharedState((prevState) => ({
        ...prevState,
        outline: outlineWithStatus
      }));
    } catch (err) {
      console.error("Error fetching outline:", err);
      displayAlert("Failed to fetch outline", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {

  }


  return (
    <div className="chatpage">
      <SideBarSmall />
      <div className="lib-container">
        <div className="scroll-container">
          <BidNavbar
            showViewOnlyMessage={showViewOnlyMessage}
            initialBidName={"initialBidName"}
          />

          {outline.length === 0 ? (
            <div></div>
          ) : (
            <div>
              <div className="table-responsive mt-3">
                <table
                  className="outline-table"
                  style={{ tableLayout: "fixed" }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: "1200px"}}>Compliance Item</th>
                      <th >
                        Section
                      </th>
                      <th
                        className="text-center"
                        style={{ width: "60px" }}
                      ></th>
                    </tr>
                  </thead>
                  <tbody>
                    {outline.map((section, index) => {
                      return (
                        <React.Fragment key={index}>
                          <tr
                          
                          >
                            <td className="compliance-item ">
                           {section.compliance_requirements}
                            </td>
                            <td className="compliance-item">
                             {section.heading}
                            </td>
                         

                            <td className="text-center">
                              <div className="d-flex justify-content-center pe-2">
                              <ComplianceEllipsisMenu 
                              onDelete={handleDelete}/>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
           
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withAuth(ComplianceMatrix);
