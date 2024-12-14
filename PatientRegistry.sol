// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PatientRegistry {
    struct Doctor {
        string id;
        string name;
        string specialization;
        string phoneNumber;
    }

 struct Patient {
    string id;
    string name;
    string disease;
    string phoneNumber;
    uint256 age;
    address registeredBy;
    string pdfCID; // Added this field to store the IPFS hash
}

    // Mappings
    mapping(string => address) public doctorIds; // Maps doctorId to address
    mapping(address => Doctor) public doctors; // Maps address to Doctor

    mapping(string => Patient) public patients; // Maps patientId to Patient
    mapping(address => string[]) public doctorPatients; // Maps doctor address to list of patientIds

    // Events
    event DoctorRegistered(string doctorId, address indexed doctorAddress, string name, string specialization, string phoneNumber);
    event PatientRegistered(string patientId, address indexed doctorAddress, string name, string disease, string phoneNumber, uint256 age);

    // Modifier to restrict functions to registered doctors
    modifier onlyRegisteredDoctor() {
        require(bytes(doctors[msg.sender].id).length > 0, "Not a registered doctor");
        _;
    }

    // Function to register a doctor
    function registerDoctor(
        string memory _doctorId,
        string memory _name,
        string memory _specialization,
        string memory _phoneNumber
    ) public {
        require(bytes(_doctorId).length > 0, "Doctor ID is required");
        require(doctorIds[_doctorId] == address(0), "Doctor ID already exists");
        require(bytes(_name).length > 0, "Doctor name is required");
        require(bytes(_specialization).length > 0, "Specialization is required");
        require(bytes(_phoneNumber).length > 0, "Phone number is required");

        doctorIds[_doctorId] = msg.sender;
        doctors[msg.sender] = Doctor(_doctorId, _name, _specialization, _phoneNumber);

        emit DoctorRegistered(_doctorId, msg.sender, _name, _specialization, _phoneNumber);
    }

   // Function to register a patient
function registerPatient(
    string memory _patientId,
    string memory _name,
    string memory _disease,
    string memory _phoneNumber,
    uint256 _age,
    string memory _pdfCID
) public onlyRegisteredDoctor {
    require(bytes(_patientId).length > 0, "Patient ID is required");
    require(bytes(patients[_patientId].id).length == 0, "Patient ID already exists");
    require(bytes(_name).length > 0, "Patient name is required");
    require(bytes(_disease).length > 0, "Disease is required");
    require(bytes(_phoneNumber).length > 0, "Phone number is required");
    require(_age > 0, "Age must be greater than 0");
    require(bytes(_pdfCID).length > 0, "PDF CID is required");

    patients[_patientId] = Patient(_patientId, _name, _disease, _phoneNumber, _age, msg.sender, _pdfCID);
    doctorPatients[msg.sender].push(_patientId);

    emit PatientRegistered(_patientId, msg.sender, _name, _disease, _phoneNumber, _age);
}

// Function to get patient info by patientId
function getPatientInfo(string memory _patientId)
    public
    view
    returns (
        string memory,
        string memory,
        string memory,
        string memory,
        uint256,
        address,
        string memory // Return pdfCID
    )
{
    Patient memory patient = patients[_patientId];
    require(bytes(patient.id).length > 0, "Patient not found");
    return (
        patient.id,
        patient.name,
        patient.disease,
        patient.phoneNumber,
        patient.age,
        patient.registeredBy,
        patient.pdfCID // Return the PDF CID
    );
}

    // Function to get all patients registered by the caller doctor
    function getAllPatientIds() public view onlyRegisteredDoctor returns (string[] memory) {
        return doctorPatients[msg.sender];
    }

    // Function to get doctor info by doctorId
    function getDoctorInfo(string memory _doctorId)
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            string memory
        )
    {
        address doctorAddress = doctorIds[_doctorId];
        require(doctorAddress != address(0), "Doctor not found");
        Doctor memory doctor = doctors[doctorAddress];
        return (
            doctor.id,
            doctor.name,
            doctor.specialization,
            doctor.phoneNumber
        );
    }
}
