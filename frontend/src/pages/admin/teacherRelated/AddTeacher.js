import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { getAllSclasses, getTeacherFreeClassSubjects, getSubjectDetails } from '../../../redux/sclassRelated/sclassHandle';
import Popup from '../../../components/Popup';
import { registerUser } from '../../../redux/userRelated/userHandle';
import { underControl } from '../../../redux/userRelated/userSlice';
import { CircularProgress } from '@mui/material';

const AddTeacher = () => {
  const params = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { currentUser } = useSelector(state => state.user)

  const subjectID = params.id
  const schoolValue = currentUser?.school?._id || currentUser?.school || currentUser?.schoolId;
  const schoolId = schoolValue && typeof schoolValue === 'object'
    ? schoolValue._id || schoolValue.id || schoolValue.schoolId
    : schoolValue;

  const { status, response, error } = useSelector(state => state.user);
  const { sclassesList, subjectsList, subjectDetails } = useSelector((state) => state.sclass);

  // Fetch classes on mount (if no subject ID in params) or fetch subject details (if subject ID in params)
  useEffect(() => {
    if (subjectID) {
      dispatch(getSubjectDetails(subjectID, "Subject"));
    } else if (schoolId) {
      dispatch(getAllSclasses(schoolId, "Sclass"));
    }
  }, [dispatch, subjectID, schoolId]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('0');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState("");
  const [loader, setLoader] = useState(false)

  // Fetch subjects when a class is selected
  useEffect(() => {
    if (selectedClass) {
      dispatch(getTeacherFreeClassSubjects(selectedClass));
    }
  }, [selectedClass, dispatch]);

  const role = "Teacher"

  useEffect(() => {
    if (subjectDetails?._id) {
      setSelectedSubjects([subjectDetails._id]);
    }
  }, [subjectDetails]);
  
  // Use inline selections if available, otherwise use params-based subject details
  let school, teachSubject, teachSclass;
  if (selectedClass && selectedSubjects.length > 0 && subjectsList && subjectsList.length > 0) {
    const selectedSubjectObj = subjectsList.find(s => s._id === selectedSubjects[0]);
    school = selectedSubjectObj?.school || (subjectDetails && subjectDetails.school);
    teachSubject = selectedSubjects[0];
    teachSclass = selectedClass;
  } else if (subjectDetails && subjectDetails._id) {
    school = subjectDetails.school;
    teachSubject = subjectDetails._id;
    teachSclass = subjectDetails.sclassName && subjectDetails.sclassName._id;
  }

  const schoolValueForSubmission = school?._id || school?.id || school || schoolId;
  const fields = { name, email, password, phone, salary: parseFloat(salary) || 0, bankName, bankAccount, accountHolderName, role, school: schoolValueForSubmission, teachSubject, teachSubjects: selectedSubjects || (teachSubject ? [teachSubject] : []), teachSclass }
  const missingSelection = !teachSubject || !teachSclass || (selectedSubjects && selectedSubjects.length === 0 && !subjectID)

  const submitHandler = (event) => {
    event.preventDefault()
    setLoader(true)
    dispatch(registerUser(fields, role))
  }

  useEffect(() => {
    if (status === 'added') {
      setMessage('Teacher registered successfully.');
      setShowPopup(true);
      setLoader(false);
      const redirectTimer = setTimeout(() => {
        dispatch(underControl())
        navigate("/Admin/teachers")
      }, 1200);

      return () => clearTimeout(redirectTimer);
    }
    else if (status === 'failed') {
      setMessage(response)
      setShowPopup(true)
      setLoader(false)
    }
    else if (status === 'error') {
      setMessage(error || response || "Network Error")
      setShowPopup(true)
      setLoader(false)
    }
  }, [status, navigate, error, response, dispatch]);

  return (
    <div>
      <div className="register">
        <form className="registerForm" onSubmit={submitHandler}>
          <span className="registerTitle">Add Teacher</span>
          <br />

          {/* Class Dropdown */}
          <label>Select Class</label>
          <select
            className="registerInput"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSubjects([]); // reset subjects when class changes
            }}
            required
          >
            <option value="">-- Choose a Class --</option>
            {Array.isArray(sclassesList) && sclassesList.length > 0 && sclassesList.map((sclass) => (
              <option key={sclass._id} value={sclass._id}>
                {sclass.sclassName}
              </option>
            ))}
          </select>

          {/* Subject Multi-select - only show if class is selected */}
          {selectedClass && (
            <>
              <label>Select Subjects (You can choose more than one)</label>
              <select
                className="registerInput"
                multiple
                value={selectedSubjects}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedSubjects(selected);
                }}
                required
              >
                {Array.isArray(subjectsList) && subjectsList.length > 0 && subjectsList.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.subName}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Display selected class and subject if from params */}
          {subjectID && subjectDetails && (
            <>
              <label>
                Subject : {subjectDetails && subjectDetails.subName}
              </label>
              <label>
                Class : {subjectDetails && subjectDetails.sclassName && subjectDetails.sclassName.sclassName}
              </label>
            </>
          )}

          <label>Name</label>
          <input
            className="registerInput"
            type="text"
            placeholder="Enter teacher's name..."
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />

          <label>Email</label>
          <input
            className="registerInput"
            type="email"
            placeholder="Enter teacher's email..."
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label>Password</label>
          <input
            className="registerInput"
            type="password"
            placeholder="Enter teacher's password..."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />

          <label>Phone (Optional)</label>
          <input
            className="registerInput"
            type="tel"
            placeholder="Enter teacher's phone number..."
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
          />

          <label>Salary (Optional)</label>
          <input
            className="registerInput"
            type="number"
            placeholder="Enter teacher's salary..."
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
            min="0"
            step="0.01"
          />

          <label>Bank Name (Optional)</label>
          <input
            className="registerInput"
            type="text"
            placeholder="Enter bank name..."
            value={bankName}
            onChange={(event) => setBankName(event.target.value)}
          />

          <label>Bank Account Number (Optional)</label>
          <input
            className="registerInput"
            type="text"
            placeholder="Enter bank account number..."
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
          />

          <label>Account Holder Name (Optional)</label>
          <input
            className="registerInput"
            type="text"
            placeholder="Enter account holder's name..."
            value={accountHolderName}
            onChange={(event) => setAccountHolderName(event.target.value)}
          />

          <button
            className="registerButton"
            type="submit"
            disabled={loader || missingSelection}
          >
            {loader ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Register'
            )}
          </button>
        </form>
      </div>
      <Popup message={message} setShowPopup={setShowPopup} showPopup={showPopup} />
    </div>
  )
}

export default AddTeacher