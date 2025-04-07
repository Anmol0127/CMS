import student from "../models/student.js";
import Test from "../models/test.js";
import Student from "../models/student.js";
import Subject from "../models/subject.js";
import Marks from "../models/marks.js";
import Attendence from "../models/attendance.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const studentLogin = async (req, res) => {
  const { username, password } = req.body;
  const errors = { usernameError: String, passwordError: String };
  try {
    const existingStudent = await Student.findOne({ username });
    if (!existingStudent) {
      errors.usernameError = "Student doesn't exist.";
      return res.status(404).json(errors);
    }
    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingStudent.password
    );
    if (!isPasswordCorrect) {
      errors.passwordError = "Invalid Credentials";
      return res.status(404).json(errors);
    }

    const token = jwt.sign(
      {
        email: existingStudent.email,
        id: existingStudent._id,
      },
      "sEcReT",
      { expiresIn: "1h" }
    );

    res.status(200).json({ result: existingStudent, token: token });
  } catch (error) {
    console.log(error);
  }
};

export const updatedPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword, email } = req.body;
    const errors = { mismatchError: String };
    if (newPassword !== confirmPassword) {
      errors.mismatchError =
        "Your password and confirmation password do not match";
      return res.status(400).json(errors);
    }

    const student = await Student.findOne({ email });
    let hashedPassword;
    hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    await student.save();
    if (student.passwordUpdated === false) {
      student.passwordUpdated = true;
      await student.save();
    }

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      response: student,
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

export const updateStudent = async (req, res) => {
  try {
    const {
      name,
      dob,
      department,
      contactNumber,
      avatar,
      email,
      batch,
      section,
      year,
      fatherName,
      motherName,
      fatherContactNumber,
    } = req.body;
    const updatedStudent = await Student.findOne({ email });
    if (name) {
      updatedStudent.name = name;
      await updatedStudent.save();
    }
    if (dob) {
      updatedStudent.dob = dob;
      await updatedStudent.save();
    }
    if (department) {
      updatedStudent.department = department;
      await updatedStudent.save();
    }
    if (contactNumber) {
      updatedStudent.contactNumber = contactNumber;
      await updatedStudent.save();
    }
    if (batch) {
      updatedStudent.batch = batch;
      await updatedStudent.save();
    }
    if (section) {
      updatedStudent.section = section;
      await updatedStudent.save();
    }
    if (year) {
      updatedStudent.year = year;
      await updatedStudent.save();
    }
    if (motherName) {
      updatedStudent.motherName = motherName;
      await updatedStudent.save();
    }
    if (fatherName) {
      updatedStudent.fatherName = fatherName;
      await updatedStudent.save();
    }
    if (fatherContactNumber) {
      updatedStudent.fatherContactNumber = fatherContactNumber;
      await updatedStudent.save();
    }
    if (avatar) {
      updatedStudent.avatar = avatar;
      await updatedStudent.save();
    }
    res.status(200).json(updatedStudent);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const testResult = async (req, res) => {
  try {
    console.log("🔹 Received request to /testresult");
    console.log("🔹 Request body:", req.body);

    const { department, year, section } = req.body;

    if (!department || !year || !section) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const student = await Student.findOne({ department, year, section });
    if (!student) {
      console.error("❌ Student not found");
      return res.status(404).json({ error: "Student not found" });
    }

    console.log("✔️ Student found:", student);

    const test = await Test.find({ department, year, section });
    if (!test.length) {
      console.error("❌ No tests found");
      return res.status(404).json({ error: "No tests found" });
    }

    console.log("✔️ Tests found:", test);

    let result = [];
    for (let i = 0; i < test.length; i++) {
      const subjectCode = test[i].subjectCode;
      const subject = await Subject.findOne({ subjectCode });
      const marks = await Marks.findOne({ student: student._id, exam: test[i]._id });

      if (marks) {
        result.push({
          marks: marks.marks,
          totalMarks: test[i].totalMarks,
          subjectName: subject ? subject.subjectName : "Unknown",
          subjectCode,
          test: test[i].test,
        });
      }
    }

    console.log("✔️ Final result:", result);

    res.status(200).json({ result });
  } catch (error) {
    console.error("❌ Error fetching test results:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};


export const attendance = async (req, res) => {
  try {
    const { department, year, section } = req.body;

    // Find the student based on the department, year, and section
    const student = await Student.findOne({ department, year, section });

    // If student is not found, return an error
    if (!student) {
      return res.status(400).json({ message: "Student not found" });
    }

    // Find all attendance records for the student, populated with the subject data
    const attendence = await Attendence.find({ student: student._id }).populate("subject");

    // If no attendance data is found, return an error
    if (!attendence || attendence.length === 0) {
      return res.status(400).json({ message: "Attendance not found" });
    }

    // Process the attendance data
    const result = attendence.map((att) => {
      let res = {};

      // Ensure the totalLecturesByFaculty is not zero
      const totalLectures = att.totalLecturesByFaculty || 0;
      const attendedLectures = att.lectureAttended || 0;

      // Handle division by zero scenario
      const percentage = totalLectures > 0
        ? ((attendedLectures / totalLectures) * 100).toFixed(2)
        : 0;

      res.percentage = percentage;
      res.subjectCode = att.subject.subjectCode;
      res.subjectName = att.subject.subjectName;
      res.attended = attendedLectures;
      res.total = totalLectures;

      return res;
    });

    // Return the processed attendance data
    res.status(200).json({ result });

  } catch (error) {
    // Handle any unexpected errors
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

