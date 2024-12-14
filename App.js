import { create } from 'ipfs-http-client';
import './App.css'; // Make sure this is the path to your CSS file
import React, { useEffect, useState } from "react";
import Web3 from "web3";
import PatientRegistry from "./contracts/PatientRegistry.json"; // Ensure this path is correct
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Table,
  Navbar,
  Nav,
  Alert,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import jsPDF from "jspdf";

// Connect to the local IPFS node
const ipfs = create({
  host: 'localhost',
  port: '5001',
  protocol: 'http',
});
const App = () => {



  
  // State Variables
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [currentView, setCurrentView] = useState("home"); // 'home', 'doctorLogin', 'doctorRegister', 'doctorDashboard', 'patientLogin', 'patientDashboard'

  // Doctor Registration
  const [doctorId, setDoctorId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialization, setDoctorSpecialization] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");

  // Doctor Login
  const [loginDoctorId, setLoginDoctorId] = useState("");
  const [loginDoctorName, setLoginDoctorName] = useState("");

  // Patient Registration
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientDisease, setPatientDisease] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientImage, setPatientImage] = useState(null); // New state for patient image

  // Patient Login
  const [loginPatientId, setLoginPatientId] = useState("");
  const [loginPatientPhone, setLoginPatientPhone] = useState("");
  const [loggedInPatient, setLoggedInPatient] = useState(null);

  // Doctor Dashboard
  const [doctorPatients, setDoctorPatients] = useState([]);
  const [showRegisteredPatients, setShowRegisteredPatients] = useState(false);

  // Alerts
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });

  // Replace with your deployed contract address
  const deployedContractAddress = "0xe939FbC5c6F74c22726Ba86Ff14b84d85dfEf74E";

  // Initialize Web3 and Contract
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          // Request account access
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const accounts = await web3.eth.getAccounts();
          setAccounts(accounts);

          // Initialize contract
          const instance = new web3.eth.Contract(
            PatientRegistry.abi,
            deployedContractAddress
          );
          setContract(instance);

          console.log("MetaMask detected and accounts exposed");
        } catch (error) {
          console.error(
            "User denied account access or an error occurred",
            error
          );
          setAlert({
            show: true,
            message: "Failed to connect to MetaMask.",
            variant: "danger",
          });
        }
      } else {
        console.error("MetaMask is not installed");
        setAlert({
          show: true,
          message: "Please install MetaMask to use this dApp.",
          variant: "warning",
        });
      }
    };
    init();
  }, [deployedContractAddress]);

  // Navigation Function
  const navigateTo = (view, clear = true) => {
    setCurrentView(view);
    if (clear) {
      clearAllStates();
    }
  };

  // Clear All States
  const clearAllStates = () => {
    // Clear Doctor States
    setDoctorId("");
    setDoctorName("");
    setDoctorSpecialization("");
    setDoctorPhone("");
    setLoginDoctorId("");
    setLoginDoctorName("");
    // Clear Patient States
    setPatientId("");
    setPatientName("");
    setPatientDisease("");
    setPatientPhone("");
    setPatientAge("");
    setPatientImage(null); // Reset Image
    // Clear Patient Login States
    setLoginPatientId("");
    setLoginPatientPhone("");
    setLoggedInPatient(null);
    // Clear Doctor Dashboard States
    setDoctorPatients([]);
    setShowRegisteredPatients(false);
    // Hide Alert
    setAlert({ show: false, message: "", variant: "" });
  };

  // Doctor Registration
  const registerDoctor = async () => {
    if (contract) {
      if (
        !doctorId ||
        !doctorName ||
        !doctorSpecialization ||
        !doctorPhone
      ) {
        setAlert({
          show: true,
          message: "All fields are required for registration.",
          variant: "warning",
        });
        return;
      }
      try {
        await contract.methods
          .registerDoctor(
            doctorId,
            doctorName,
            doctorSpecialization,
            doctorPhone
          )
          .send({ from: accounts[0] });
        setAlert({
          show: true,
          message: "Doctor registered successfully!",
          variant: "success",
        });
        navigateTo("doctorDashboard");
      } catch (error) {
        console.error("Error registering doctor:", error);
        setAlert({
          show: true,
          message: "Error registering doctor. Check console for details.",
          variant: "danger",
        });
      }
    }
  };

  // Doctor Login
  const loginDoctor = async () => {
    if (contract) {
      if (!loginDoctorId || !loginDoctorName) {
        setAlert({
          show: true,
          message: "Both Doctor ID and Name are required for login.",
          variant: "warning",
        });
        return;
      }
      try {
        const doctorInfo = await contract.methods
          .getDoctorInfo(loginDoctorId)
          .call();
        if (doctorInfo[1] === loginDoctorName) {
          // doctorInfo = [id, name, specialization, phoneNumber]
          setAlert({
            show: true,
            message: "Doctor logged in successfully!",
            variant: "success",
          });
          navigateTo("doctorDashboard");
          fetchDoctorPatients(loginDoctorId);
        } else {
          setAlert({
            show: true,
            message: "Invalid Doctor ID or Name.",
            variant: "danger",
          });
        }
      } catch (error) {
        console.error("Error logging in doctor:", error);
        setAlert({
          show: true,
          message: "Error logging in doctor. Check console for details.",
          variant: "danger",
        });
      }
    }
  };

// Fetch Doctor's Patients
const fetchDoctorPatients = async (doctorId) => {
  if (contract) {
    try {
      // Assuming getAllPatientIds() returns patients registered by the caller
      const patientIds = await contract.methods.getAllPatientIds().call({ from: accounts[0] });
      const patientsData = await Promise.all(patientIds.map(async (pid) => {
        const patient = await contract.methods.getPatientInfo(pid).call();
        return {
          id: patient[0],
          name: patient[1],
          disease: patient[2],
          phoneNumber: patient[3],
          age: parseInt(patient[4], 10), // Make sure age is included here
        };
      }));
      setDoctorPatients(patientsData);
    } catch (error) {
      console.error("Error fetching doctor's patients:", error);
      setAlert({
        show: true,
        message: "Error fetching doctor's patients. Check console for details.",
        variant: "danger",
      });
    }
  }
};
// // Patient Registration
// const registerPatient = async () => {
//   if (contract) {
//     if (
//       !patientId ||
//       !patientName ||
//       !patientDisease ||
//       !patientPhone ||
//       !patientAge ||
//       !patientImage
//     ) {
//       setAlert({
//         show: true,
//         message: "All fields are required for patient registration.",
//         variant: "warning",
//       });
//       return;
//     }
//     try {
//       // Generate PDF with patient details
//       const doc = new jsPDF();
//       doc.setFontSize(16);
//       doc.text("Patient Information", 10, 20);
//       doc.setFontSize(12);
//       doc.text(`ID: ${patientId}`, 10, 30);
//       doc.text(`Name: ${patientName}`, 10, 40);
//       doc.text(`Disease: ${patientDisease}`, 10, 50);
//       doc.text(`Phone: ${patientPhone}`, 10, 60);
//       doc.text(`Age: ${patientAge}`, 10, 70);

//       if (patientImage) {
//         const img = await getBase64(patientImage);
//         doc.addImage(img, "JPEG", 10, 80);
//       }

//       // Convert the PDF to a Blob
//       const pdfBlob = doc.output('blob');

//       // Upload the PDF Blob to IPFS
//       const ipfsResult = await ipfs.add(pdfBlob);
//       const pdfCID = ipfsResult.cid.toString();
//       console.log('PDF stored in IPFS with CID:', pdfCID);

//       // Store patient details and the IPFS hash (CID) on the blockchain
//       await contract.methods
//         .registerPatient(patientId, patientName, patientDisease, patientPhone, patientAge, pdfCID)
//         .send({ from: accounts[0] });

//       setAlert({
//         show: true,
//         message: "Patient registered successfully and PDF uploaded to IPFS!",
//         variant: "success",
//       });
//       fetchDoctorPatients(doctorId);
//       clearAllStates();
//     } catch (error) {
//       console.error("Error registering patient:", error);
//       setAlert({
//         show: true,
//         message: "Error registering patient. Check console for details.",
//         variant: "danger",
//       });
//     }
//   }
// };
const registerPatient = async () => {
  if (contract) {
    // Basic validation checks
    if (
      !patientId ||
      !patientName ||
      !patientDisease ||
      !patientPhone ||
      !patientAge
    ) {
      setAlert({
        show: true,
        message: "All fields except the image are required for patient registration.",
        variant: "warning",
      });
      return;
    }

    // Validate that the name is a string and contains only letters
    if (!/^[a-zA-Z\s]+$/.test(patientName)) {
      setAlert({
        show: true,
        message: "Name should contain only letters and spaces.",
        variant: "warning",
      });
      return;
    }

    // Validate that the phone number contains exactly 10 digits
    if (!/^\d{10}$/.test(patientPhone)) {
      setAlert({
        show: true,
        message: "Phone number should contain exactly 10 digits.",
        variant: "warning",
      });
      return;
    }

    // Validate that age is a positive number
    if (!/^\d+$/.test(patientAge) || parseInt(patientAge) <= 0) {
      setAlert({
        show: true,
        message: "Age should be a positive number.",
        variant: "warning",
      });
      return;
    }

    try {
      // Generate PDF with patient details
      const doc = new jsPDF();

      // Define margins
      const marginLeft = 20;
      const marginTop = 20;
      const marginRight = 190;
      const marginBottom = 270;

      // Draw black margin lines
      doc.setDrawColor(0, 0, 0); // Set draw color to black
      doc.line(marginLeft, marginTop, marginRight, marginTop); // Top margin line
      doc.line(marginLeft, marginTop, marginLeft, marginBottom); // Left margin line
      doc.line(marginRight, marginTop, marginRight, marginBottom); // Right margin line
      doc.line(marginLeft, marginBottom, marginRight, marginBottom); // Bottom margin line

      // Set content with margins
      doc.setFontSize(16);
      doc.text("Patient Information", marginLeft + 5, marginTop + 10);

      doc.setFontSize(12);
      doc.text(`ID: ${patientId}`, marginLeft + 5, marginTop + 25);
      doc.text(`Name: ${patientName}`, marginLeft + 5, marginTop + 35);
      doc.text(`Disease: ${patientDisease}`, marginLeft + 5, marginTop + 45);
      doc.text(`Phone: ${patientPhone}`, marginLeft + 5, marginTop + 55);
      doc.text(`Age: ${patientAge}`, marginLeft + 5, marginTop + 65);

    // Get the current date and time
const currentDate = new Date();
const day = currentDate.getDate().toString().padStart(2, '0');
const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based, so add 1
const year = currentDate.getFullYear();

// Get hours and convert to 12-hour format
let hours = currentDate.getHours();
const minutes = currentDate.getMinutes().toString().padStart(2, '0');
const seconds = currentDate.getSeconds().toString().padStart(2, '0');
const ampm = hours >= 12 ? 'PM' : 'AM';
hours = hours % 12 || 12; // Convert '0' hours to '12' for 12-hour format
const formattedHours = hours.toString().padStart(2, '0');

// Format the date and time as "DD-MM-YYYY HH:MM:SS AM/PM"
const formattedDateTime = `${day}-${month}-${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;

// Add the formatted date and time to the PDF
doc.text(`Date: ${formattedDateTime}`, marginLeft + 5, marginTop + 85);


// Add the formatted date and time to the PDF
doc.text(`Date: ${formattedDateTime}`, marginLeft + 5, marginTop + 85);



      // Add image if provided
      if (patientImage) {
        const img = await getBase64(patientImage);
        doc.addImage(img, "JPEG", marginLeft + 5, marginTop + 95, 50, 50);
      }

      // Convert the PDF to a Blob
      const pdfBlob = doc.output('blob');

      // Upload the PDF Blob to IPFS
      const ipfsResult = await ipfs.add(pdfBlob);
      const pdfCID = ipfsResult.path; // Get the CID

      console.log('PDF stored in IPFS with CID:', pdfCID);

      // Store patient details and the IPFS hash (CID) on the blockchain
      await contract.methods
        .registerPatient(patientId, patientName, patientDisease, patientPhone, patientAge, pdfCID)
        .send({ from: accounts[0] });

      setAlert({
        show: true,
        message: "Patient registered successfully and PDF uploaded to IPFS!",
        variant: "success",
      });
      fetchDoctorPatients(doctorId);
      clearAllStates();
    } catch (error) {
      console.error("Error registering patient:", error);
      setAlert({
        show: true,
        message: "Error registering patient. Check console for details.",
        variant: "danger",
      });
    }
  }
};



// Helper function to convert image file to base64
const getBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

  // Patient Login
const loginPatient = async () => {
  if (contract) {
    if (!loginPatientId || !loginPatientPhone) {
      setAlert({
        show: true,
        message: "Both Patient ID and Phone Number are required for login.",
        variant: "warning",
      });
      return;
    }
    try {
      const patientInfo = await contract.methods
        .getPatientInfo(loginPatientId)
        .call();
      console.log("Fetched Patient Info:", patientInfo);

      if (patientInfo[3] === loginPatientPhone) {
        const patientData = {
          id: patientInfo[0],
          name: patientInfo[1],
          disease: patientInfo[2],
          phoneNumber: patientInfo[3],
          age: parseInt(patientInfo[4], 10),
          pdfCID: patientInfo[6], // Retrieve the PDF CID
        };

        setLoggedInPatient(patientData);
        setAlert({
          show: true,
          message: "Patient logged in successfully!",
          variant: "success",
        });
        navigateTo("patientDashboard", false);
      } else {
        setAlert({
          show: true,
          message: "Invalid Patient ID or Phone Number.",
          variant: "danger",
        });
      }
    } catch (error) {
      console.error("Error logging in patient:", error);
      setAlert({
        show: true,
        message: "Error logging in patient. Check console for details.",
        variant: "danger",
      });
    }
  }
};


//patient pdf
const getImageFromUrl = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return getBase64(blob);
};


// Assuming this is part of the generatePDF function or similar
const downloadPDF = async (pdfCID) => {
  try {
    // Construct the local IPFS URL
    const ipfsUrl = `http://localhost:8080/ipfs/${pdfCID}`;

    // Trigger download
    const response = await fetch(ipfsUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch the PDF file from IPFS');
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Patient_Report_${pdfCID}.pdf`; // Name of the downloaded file
    link.click(); // Trigger the download

  } catch (error) {
    console.error("Error downloading PDF:", error);
    setAlert({
      show: true,
      message: "Error downloading PDF. Check console for details.",
      variant: "danger",
    });
  }
};
const generatePDF = async (loggedInPatient) => {
  
  try {
    const doctorId = await contract.methods.doctorIds(accounts[0]).call();
    if (doctorId === "") {
      setAlert({
        show: true,
        message: "You are not registered as a doctor.",
        variant: "warning",
      });
      return;
    }


    // Generate PDF with patient and doctor details
    const doc = new jsPDF();


    // Add Patient Information
    doc.setFontSize(16);
    doc.text("Patient Information", 10, 80);
    doc.setFontSize(12);
    doc.text(`ID: ${loggedInPatient.id}`, 10, 90);
    doc.text(`Name: ${loggedInPatient.name}`, 10, 100);
    doc.text(`Disease: ${loggedInPatient.disease}`, 10, 110);
    doc.text(`Phone: ${loggedInPatient.phoneNumber}`, 10, 120);
    doc.text(`Age: ${loggedInPatient.age}`, 10, 130);

    // Add Patient Image
    if (loggedInPatient.imageUrl) {
      const imgBase64 = await getImageFromUrl(loggedInPatient.imageUrl);
      doc.addImage(imgBase64, "JPEG", 10, 140, 50, 50); // Adjust size and position as needed
    }

    // Finalize and Download PDF
    doc.save(`Patient_${loggedInPatient.id}_Report.pdf`);

    setAlert({
      show: true,
      message: "PDF generated successfully!",
      variant: "success",
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    setAlert({
      show: true,
      message: "Error generating PDF. Check console for details.",
      variant: "danger",
    });
  }
};

// Function to navigate to the IPFS URL
const navigateToIPFS = (pdfCID) => {
  // Construct the IPFS URL using the CID
  const ipfsUrl = `http://localhost:8080/ipfs/${pdfCID}`;
  
  // Redirect to the IPFS URL
  window.open(ipfsUrl, '_blank'); // Open in a new tab
};

// Function to navigate to the patient's report based on their ID and phone number
const navigateToPatientReport = async (patientId, patientPhone) => {
  try {
    // Fetch the patient's info from the contract using their ID
    const patientInfo = await contract.methods.getPatientInfo(patientId).call();

    // Check if the provided phone number matches the one stored in the contract
    if (patientInfo[3] === patientPhone) {
      const pdfCID = patientInfo[6]; // Assuming the PDF CID is stored in index 6
      navigateToIPFS(pdfCID); // Function that navigates to the IPFS URL of the report
    } else {
      setAlert({
        show: true,
        message: "Phone number does not match. Unable to access the report.",
        variant: "danger",
      });
    }
  } catch (error) {
    console.error("Error fetching patient report:", error);
    setAlert({
      show: true,
      message: "Error fetching the patient report. Check console for details.",
      variant: "danger",
    });
  }
};





  return (
    <div>
      {/* Navigation Bar
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container> */}
          {/* <Navbar.Brand href="#">Patient Registration</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="#" onClick={() => navigateTo("home")}>
                Home
              </Nav.Link>
              <Nav.Link href="#" onClick={() => navigateTo("doctorLogin")}>
                Doctor
              </Nav.Link>
              <Nav.Link href="#" onClick={() => navigateTo("patientLogin")}>
                Patient
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar> */}

<div className="bk">
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#">SHDMS</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="#" onClick={() => setCurrentView("home")}>Home</Nav.Link>
              <Nav.Link href="#" onClick={() => setCurrentView("doctorLogin")}>Doctor</Nav.Link>
              <Nav.Link href="#" onClick={() => setCurrentView("patientLogin")}>Patient</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container style={{ marginTop: "20px" }}>
        {/* Your content and conditional rendering for views */}
        {currentView === "home" && <div></div>}
        {/* Other components like DoctorLogin, PatientLogin, etc. */}
      </Container>
    </div>

      {/* Alerts */}
      <Container style={{ marginTop: "20px" }}>
        {alert.show && (
          <Alert
            variant={alert.variant}
            onClose={() => setAlert({ ...alert, show: false })}
            dismissible
          >
            {alert.message}
          </Alert>
        )}
      </Container>

      {/* Main Content */}
      <Container style={{ marginTop: "20px" }}>
        {/* Home View */}
        {currentView === "home" && (
          <Row className="justify-content-md-center">
            <Col md="auto" className="text-center">
              <h2>Welcome to the SHDMS</h2>
              <br></br>
              <br></br>
              <h5>Select Your Role</h5>
            
              <Button
                variant="primary"
                size="lg"
                className="m-2"
                onClick={() => navigateTo("doctorLogin")}
              >
                Doctor
              </Button>
              <Button
                variant="success"
                size="lg"
                className="m-2"
                onClick={() => navigateTo("patientLogin")}
              >
                Patient
              </Button>
            </Col>
          </Row>
        )}

        {/* Doctor Section */}
        {(currentView === "doctorLogin" ||
          currentView === "doctorRegister") && (
          <Row className="justify-content-md-center">
            <Col md={6}>
              <h3 className="text-center mb-4">Doctor Section</h3>
              <div className="d-flex justify-content-center mb-4">
                <Button
                  variant={
                    currentView === "doctorLogin"
                      ? "secondary"
                      : "outline-secondary"
                  }
                  className="me-2"
                  onClick={() => navigateTo("doctorLogin")}
                >
                  Login
                </Button>
                <Button
                  variant={
                    currentView === "doctorRegister"
                      ? "secondary"
                      : "outline-secondary"
                  }
                  onClick={() => navigateTo("doctorRegister")}
                >
                  Register
                </Button>
              </div>

              {/* Doctor Registration Form */}
              {currentView === "doctorRegister" && (
                <Form>
                  <Form.Group className="mb-3" controlId="formDoctorId">
                    <Form.Label>Doctor ID</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter Doctor ID"
                      value={doctorId}
                      onChange={(e) => setDoctorId(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="formDoctorName">
                    <Form.Label>Doctor Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter Doctor Name"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group
                    className="mb-3"
                    controlId="formDoctorSpecialization"
                  >
                    <Form.Label>Specialization</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter Specialization"
                      value={doctorSpecialization}
                      onChange={(e) =>
                        setDoctorSpecialization(e.target.value)
                      }
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="formDoctorPhone">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter Phone Number"
                      value={doctorPhone}
                      onChange={(e) => setDoctorPhone(e.target.value)}
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="button"
                    onClick={registerDoctor}
                    className="w-100"
                  >
                    Register
                  </Button>
                </Form>
              )}

              {/* Doctor Login Form */}
              {currentView === "doctorLogin" && (
                <Form>
                  <Form.Group className="mb-3" controlId="formLoginDoctorId">
                    <Form.Label>Doctor ID</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter Doctor ID"
                      value={loginDoctorId}
                      onChange={(e) => setLoginDoctorId(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group
                    className="mb-3"
                    controlId="formLoginDoctorName"
                  >
                    <Form.Label>Doctor Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter Doctor Name"
                      value={loginDoctorName}
                      onChange={(e) => setLoginDoctorName(e.target.value)}
                    />
                  </Form.Group>

                  <Button
                    variant="success"
                    type="button"
                    onClick={loginDoctor}
                    className="w-100"
                  >
                    Login
                  </Button>
                </Form>
              )}
            </Col>
          </Row>
        )}

        {/* Doctor Dashboard */}
        {currentView === "doctorDashboard" && (
          <Row className="justify-content-md-center">
            <Col md={10}>
              {/* Logout Button */}
              <div className="d-flex justify-content-end mb-3">
                <Button variant="danger" onClick={() => navigateTo("home")}>
                  Logout
                </Button>
              </div>
              <h3 className="text-center mb-4">Doctor Dashboard</h3>

              {/* Register Patient Section */}
              <Row className="mb-4">
                <Col md={6}>
                  <h5>Register Patient</h5>
                  <Form>
                    <Form.Group className="mb-3" controlId="formPatientId">
                      <Form.Label>Patient ID <span style={{ color: 'red' }}>*</span></Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter Patient ID"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formPatientName">
                      <Form.Label>Patient Name <span style={{ color: 'red' }}>*</span></Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter Patient Name"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                      />

<Form.Group className="mb-3" controlId="formPatientAge">
                      <Form.Label>Age <span style={{ color: 'red' }}>*</span></Form.Label>
                      <Form.Control
                        type="number"
                        placeholder="Enter Age"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                      />
                    </Form.Group> 
                    </Form.Group>

                    

                  
                    <Form.Group
                      className="mb-3"
                      controlId="formPatientPhone"
                    >
                      <Form.Label>Phone Number <span style={{ color: 'red' }}>*</span></Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter Phone Number"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                      />
                    </Form.Group>

                    <Form.Group
                      className="mb-3"
                      controlId="formPatientDisease"
                    >
                      <Form.Label>Disease <span style={{ color: 'red' }}>*</span></Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter Disease"
                        value={patientDisease}
                        onChange={(e) => setPatientDisease(e.target.value)}
                      />
                    </Form.Group>


                    {/* Image Upload Field */}
                    <Form.Group
                      className="mb-3"
                      controlId="formPatientImage"
                    >
                      <Form.Label>Upload Image</Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPatientImage(e.target.files[0])}
                      />
                    </Form.Group>

                    <Button
                      variant="primary"
                      type="button"
                      onClick={registerPatient}
                      className="w-100"
                    >
                      Register Patient
                    </Button>
                  </Form>
                </Col>

                <Col md={6} className="d-flex align-items-end">
                  <Button
                    variant="info"
                    onClick={() =>
                      setShowRegisteredPatients(!showRegisteredPatients)
                    }
                    className="w-100"
                  >
                    {showRegisteredPatients
                      ? "Hide Registered Patients"
                      : "View Registered Patients"}
                  </Button>
                </Col>
              </Row>

              {/* Registered Patients Table */}
              {showRegisteredPatients && (
                <Row>
                  <Col>
                    <h5 className="text-center mb-3">Registered Patients</h5>
                    {doctorPatients.length > 0 ? (
                      <Table striped bordered hover responsive>
                      <thead>
                        <tr >
                          <th>Patient ID</th>
                          <th>Name</th>
                          <th>Disease</th>
                          <th>Phone Number</th>
                          <th>Age</th>
                          <th>View Report</th> {/* New column header for the button */}
                        </tr>
                      </thead>
                      <tbody>
                        {doctorPatients.map((patient, index) => (
                          <tr key={index}>
                            <td>{patient.id}</td>
                            <td>{patient.name}</td>
                            <td>{patient.disease}</td>
                            <td>{patient.phoneNumber}</td>
                            <td>{patient.age}</td>
                            <td>
  <div className="d-flex justify-content-center">
    <Button
      variant="primary" 
      onClick={() => navigateToPatientReport(patient.id, patient.phoneNumber)} // Call the function with patient ID and phone number
    >
      View Report
    </Button>
  </div>
</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    
                    ) : (
                      <Alert variant="warning" className="text-center">
                        No patients registered yet.
                      </Alert>
                    )}
                  </Col>
                </Row>
              )}
            </Col>
          </Row>
        )}

      {/* Patient Section */}
{(currentView === "patientLogin" || currentView === "patientDashboard") && (
  <Row className="justify-content-md-center">
    <Col md={6}>
      <h3 className="text-center mb-4">Patient Dashboard</h3>
      {currentView === "patientLogin" && (
        <Form>
          <Form.Group className="mb-3" controlId="formLoginPatientId">
            <Form.Label>Patient ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Patient ID"
              value={loginPatientId}
              onChange={(e) => setLoginPatientId(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formLoginPatientPhone">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Phone Number"
              value={loginPatientPhone}
              onChange={(e) => setLoginPatientPhone(e.target.value)}
            />
          </Form.Group>

          <Button
            variant="success"
            type="button"
            onClick={loginPatient}
            className="w-100"
          >
            Login
          </Button>
        </Form>
      )}
{currentView === "patientDashboard" && (
  <div>
{/* Logout Button */}
<div className="d-flex justify-content-end mb-3">
  <Button
    variant="danger"
    onClick={() => navigateTo("home")}
  >
    Logout
  </Button>
</div>

   
    {loggedInPatient ? (
      <div>
        {/* View PDF Button */}
        {/* <Button
          variant="primary"
          onClick={() => generatePDF(loggedInPatient)}
          className="mb-3"
        >
          View Your Medical Report
        </Button>
        // Update the Download PDF Button in the Patient Dashboard */}
{/* <Button
  variant="success"
  onClick={() => downloadPDF(loggedInPatient.pdfCID)}
  className="mb-3 ms-2"
>
  Download PDF
</Button> */}

<div className="d-flex justify-content-center">
  <Button
    variant="success"
    onClick={() => navigateToIPFS(loggedInPatient.pdfCID)} // Use the CID from loggedInPatient
    className="mb-3"
  >
    View Your Medical Report
  </Button>
</div>


        <Table striped bordered hover responsive>
          <tbody>
            <tr>
              <th>Patient ID</th>
              <td>{loggedInPatient.id}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{loggedInPatient.name}</td>
            </tr>
            <tr>
              <th>Disease</th>
              <td>{loggedInPatient.disease}</td>
            </tr>
            <tr>
              <th>Phone Number</th>
              <td>{loggedInPatient.phoneNumber}</td>
            </tr>
            <tr>
              <th>Age</th>
              <td>{loggedInPatient.age || 'N/A'}</td> {/* Display age or 'N/A' */}
            </tr>
          </tbody>
        </Table>
      </div>
          ) : (
            <Alert variant="warning" className="text-center">
              No patient data available.
            </Alert>
          )}
        </div>
      )}
    </Col>
  </Row>
)}
</Container>
</div>
);
};

export default App;
