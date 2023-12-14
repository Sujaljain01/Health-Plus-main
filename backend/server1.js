import express from 'express';
import bodyParser from "body-parser";
import cors from 'cors';
import mongoose from 'mongoose';
// import multer from 'multer';
// import passport from 'passport';
// import passportLocalMongoose from "passport-local-mongoose";
// import session from 'express-session';
// import 'mongoose-encryption';
import dotenv from 'dotenv';

const Schema = mongoose.Schema;
const app = express();
const port = 4000;
dotenv.config();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/files',express.static('files'));


const corsOptions = {
    origin: '*',
    credentials : true,
    optionSuccessStatus : 200
}

app.use(cors(corsOptions));

// app.use(session({
//     secret: process.env.SECRET,
//     resave: false,
//     saveUninitialized: true,
//   }));

//   app.use(passport.initialize());
//   app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1:27017/healthSyncDB", {UseNewUrlParser : true}).then(function(){
      console.log("connected")}).catch(function(err){
      console.log(err);
});


const userSchema = new Schema({
    username : String,
    password : String,
})

const User = new mongoose.model("User", userSchema);

const adminSchema = new Schema({
    username : String,
    password : String,
})

const Admin = new mongoose.model("Admin", adminSchema);


const patientSchema = new Schema({
    name : String,
    contactNumber : String,
    gender : String
})

const Patient = new mongoose.model("Patient", patientSchema);


const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    specialization: {
        type: String,
        required: true,
    },
    availability: {
        type: [Number], // Array of time slots (e.g., [9, 10, 11, 14, 15, 16])
        default: [],
    },
});


const Doctor = new mongoose.model("Doctor", doctorSchema);

const appointmentSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true,
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
    },
    start_time: {
        type: Date,
        required: true,
    },
    end_time: {
        type: Date,
        required: true,
    },
    is_emergency: {
        type: Boolean,
        default: false,
    },
});

const Appointment = mongoose.model('Appointment', appointmentSchema);




app.post('/patientDetails', async (req, res) => {
    try {
        // Extract patient details from the request
        const pName = req.body.patientName;
        const pNumber = req.body.patientNumber;
        const pGender = req.body.patientGender;
        const appTime = req.body.appointmentTime;

        // Find a doctor based on specialization (you may need a more specific query)
        const doctor = await Doctor.findOne({ specialization: 'Cardiologist' });

        if (!doctor) {
            return res.status(404).json({ error: 'No available doctor found for the given specialization.' });
        }

        // Find the closest available time slot based on the specified appointment time
        const closestAvailableTime = findClosestAvailableTime(doctor.availability, new Date(appTime));

        if (!closestAvailableTime) {
            return res.status(400).json({ error: 'No available time slot for the specified appointment time.' });
        }

        // Create a new patient
        const newPatient = new Patient({
            name: pName,
            contactNumber: pNumber,
            gender: pGender,
        });

        // Save the patient to the database
        const savedPatient = await newPatient.save();

        // Create a new appointment using the closest available time slot
        const newAppointment = new Appointment({
            doctor: doctor._id, // Use the doctor's ObjectId
            patient: savedPatient._id, // Use the patient's ObjectId
            start_time: closestAvailableTime,
            end_time: new Date(closestAvailableTime.getTime() + (1 * 60 * 60 * 1000)), // Assuming 1 hour appointment duration
            is_emergency: false, // Adjust this based on your requirements
        });

        // Save the appointment to the database
        const savedAppointment = await newAppointment.save();

        res.status(201).json({
            message: 'Patient details and appointment created successfully.',
            appointment: savedAppointment,
        });
    } catch (error) {
        console.error('Error processing appointment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

function findClosestAvailableTime(availability, desiredTime) {
    const sortedAvailability = availability.sort((a, b) => Math.abs(desiredTime - new Date(a)) - Math.abs(desiredTime - new Date(b)));
    return sortedAvailability[0];
}

app.listen(port, () => {
    console.log(`API is running at http://localhost:${port}`);
  });