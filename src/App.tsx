import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import axios from "axios";

const redirectUri = "http://127.0.0.1:3000/";
const url = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/";
const client_id = "5b094ea1-cb59-40dd-8a78-01cd05699712";
const issstate = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/";

interface Patient {
  name?: string;
  birthDate?: string;
  gender?: string;
  phoneNumber?: string;
  observationId?: string;
  Hemoglobin?: number;
  Platelets?: number;
}

const App: React.FC = () => {
  const [tokenDetails, setTokenDetails] = useState("");
  const [fhirId, setFhirId] = useState("");
  const [patientDetails, setPatientDetails] = useState<Patient>({
    name: "",
    birthDate: "",
    gender: "",
    phoneNumber: "",
  });
  const [patientReport, setPatientReport] = useState<Patient>({
    observationId: "",
    Hemoglobin: 0,
    Platelets: 0,
  });

  const [firstRender, setFirstRender] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let code = params.get("code");
    if (code && firstRender) {
      let payload = {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: client_id,
      };
      // if (firstRender) {
      setFirstRender(false);
      axios
        .post(
          "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
          payload,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        )
        .then((response) => {
          setTokenDetails(response?.data);
          localStorage.setItem("access_token", response?.data?.access_token);
          console.log("response", response);
        })
        .catch((error) => {
          console.log("error", error);
        });
      // }
    }
  }, []);

  const handleRedirect = () => {
    window.location.href = `${url}authorize?scope=launch&response_type=code&redirect_uri=${redirectUri}&client_id=${client_id}&state=1234&aud=${issstate}`;
  };
  const isloggedIn = localStorage.getItem("access_token");

  const getPatientDetails = () => {
    let access_token = localStorage.getItem("access_token");
    //hostname/instance/api/FHIR/R4/Patient?family=lufhir&given=kazuya&birthdate=1986-02-23
    // https: //fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient/T1wI5bk8n1YVgvWk9D05BmRV0Pi3ECImNSK8DKyKltsMB
    axios
      .get(
        `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient/${fhirId}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then((response) => {
        setPatientDetails({
          ...patientDetails,
          name: response?.data?.name[0]?.text,
          gender: response?.data?.gender,
          birthDate: response?.data?.birthDate,
          phoneNumber: response?.data?.telecom[0]?.value,
        });
      })
      .catch((error) => {
        console.log("error", error);
      });
  };

  const getPatientObs = async () => {
    const PatientReport = { ...patientReport };
    let access_token = localStorage.getItem("access_token");

    try {
      const response = await axios.get(
        `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Observation?patient=${fhirId}&category=laboratory`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      if (response) {
        PatientReport.observationId = response?.data?.entry[0]?.fullUrl;

        const hemoglobin = await axios.get(
          `${response?.data?.entry[0]?.fullUrl}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );
        if (hemoglobin) {
          PatientReport.Hemoglobin = hemoglobin?.data?.valueQuantity?.value;

          const Platelets = await axios.get(
            `${response?.data?.entry[1]?.fullUrl}`,
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
              },
            }
          );
          if (Platelets) {
            PatientReport.Platelets = Platelets?.data?.valueQuantity?.value;
          }
        }
      }
      setPatientReport(PatientReport);
    } catch (err) {
      console.log("err", err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {isloggedIn ? (
          <div>
            <input
              placeholder="Enter patient fhir Id"
              onChange={(e) => setFhirId(e.target?.value)}
              value={fhirId}
            />
            <button onClick={getPatientDetails}>sadasd</button>
            <button onClick={getPatientObs} disabled={!patientDetails}>
              observation
            </button>
          </div>
        ) : (
          <>
            <button onClick={handleRedirect}>signIn</button>
          </>
        )}
        <div>
          {patientDetails?.name && (
            <>
              <div>Name: {patientDetails?.name}</div>
              <div>Gender: {patientDetails?.gender}</div>
              <div>Date Of Birth: {patientDetails?.birthDate}</div>
              <div>
                Hemoglobin A1c/Hemoglobin.total in Blood:{" "}
                {patientReport?.Hemoglobin}
              </div>
              <div>
                {" "}
                Platelets [#/volume] in Blood by Automated count:{" "}
                {patientReport.Platelets} 10*3/uL
              </div>
            </>
          )}
        </div>
      </header>
    </div>
  );
};

export default App;
