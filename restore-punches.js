// Script to restore lost punch data to Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Configuration - UPDATE THESE VALUES
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// REPLACE 'USER_UID_HERE' with the actual user ID whose data was lost
const USER_UID = "USER_UID_HERE"; // ⚠️ UPDATE THIS!

// Specify which database to use - either "dev-db" or "prod"
const DATABASE_ID = "prod"; // ⚠️ UPDATE THIS IF NEEDED!

const lostPunchData = [
  {
    "note": "30 minute dîner pas prit ",
    "punchIn": 1777291380000,
    "punchOut": 1777317960000
  },
  {
    "punchOut": 1777404960000,
    "note": "Dîner ",
    "punchIn": 1777379520000
  },
  {
    "punchOut": 1777492800000,
    "note": "Dîner ",
    "punchIn": 1777463280000
  },
  {
    "note": "",
    "punchOut": 1777564492868,
    "punchIn": 1777549756479
  },
  {
    "note": "Diner",
    "punchIn": 1777639560000,
    "punchOut": 1777663560000
  },
  {
    "punchIn": 1777896720000,
    "punchOut": 1777923960000,
    "note": "Diner"
  },
  {
    "punchIn": 1777983720000,
    "note": "Dîner ",
    "punchOut": 1778009700000
  },
  {
    "punchOut": 1778096580000,
    "note": "Diner",
    "punchIn": 1778070900000
  },
  {
    "note": "Diner",
    "punchOut": 1778183100000,
    "punchIn": 1778155740000
  },
  {
    "punchOut": 1778242811219,
    "note": "",
    "punchIn": 1778242809680
  },
  {
    "punchIn": 1778243040000,
    "note": "Dîner ",
    "punchOut": 1778268600000
  },
  {
    "punchIn": 1778501160000,
    "note": "Diner",
    "punchOut": 1778529600000
  },
  {
    "punchIn": 1778588640000,
    "punchOut": 1778614380000,
    "note": "Diner"
  },
  {
    "punchIn": 1778674860000,
    "punchOut": 1778701620000,
    "note": "Diner"
  },
  {
    "note": "Diner",
    "punchOut": 1778787780000,
    "punchIn": 1778761980000
  },
  {
    "punchIn": 1778847300000,
    "note": "Diner",
    "punchOut": 1778872980000
  },
  {
    "punchOut": 1779132900000,
    "punchIn": 1779106020000,
    "note": "Diner"
  },
  {
    "note": "Diner",
    "punchOut": 1779219900000,
    "punchIn": 1779193140000
  },
  {
    "punchIn": 1779279360000,
    "note": "Diner",
    "punchOut": 1779305700000
  },
  {
    "punchIn": 1779366300000,
    "punchOut": 1779391500000,
    "note": "Diner"
  },
  {
    "punchOut": 1779477840000,
    "note": "Diner",
    "punchIn": 1779452940000
  },
  {
    "punchOut": 1779737400000,
    "note": "Diner",
    "punchIn": 1779711240000
  },
  {
    "punchOut": 1779824400000,
    "punchIn": 1779798420000,
    "note": "Diner"
  },
  {
    "note": "Diner",
    "punchIn": 1779883980000,
    "punchOut": 1779910800000
  },
  {
    "note": "Diner",
    "punchIn": 1779972060000,
    "punchOut": 1779994560000
  },
  {
    "note": "Diner",
    "punchOut": 1780083900000,
    "punchIn": 1780056240000
  },
  {
    "note": "Diner",
    "punchIn": 1780316160000,
    "punchOut": 1780345200000
  },
  {
    "note": "Diner",
    "punchOut": 1780431000000,
    "punchIn": 1780402080000
  },
  {
    "punchIn": 1780489920000,
    "note": "Oublie punch ",
    "punchOut": 1780503300000
  },
  {
    "note": "Diner",
    "punchIn": 1780576320000,
    "punchOut": 1780601400000
  },
  {
    "punchOut": 1780689180000,
    "note": "Diner",
    "punchIn": 1780661460000
  },
  {
    "note": "Diner",
    "punchOut": 1780945800000,
    "punchIn": 1780921440000
  },
  {
    "punchOut": 1781033400000,
    "punchIn": 1781007540000,
    "note": "Diner"
  },
  {
    "punchIn": 1781093880000,
    "note": "Dîner ",
    "punchOut": 1781120400000
  },
  {
    "note": "Diner",
    "punchIn": 1781179680000,
    "punchOut": 1781208000000
  },
  {
    "punchOut": 1781290800000,
    "punchIn": 1781266800000,
    "note": "Diner"
  },
  {
    "note": "Diner",
    "punchIn": 1781524920000,
    "punchOut": 1781551800000
  },
  {
    "punchIn": 1781612340000,
    "punchOut": 1781638200000,
    "note": "Diner"
  },
  {
    "note": "Diner",
    "punchOut": 1781724600000,
    "punchIn": 1781698620000
  },
  {
    "note": "Diner",
    "punchOut": 1781810400000,
    "punchIn": 1781784600000
  },
  {
    "punchIn": 1781871720000,
    "note": "Diner",
    "punchOut": 1781898480000
  },
  {
    "punchIn": 1782735240000,
    "punchOut": 1782762600000,
    "note": "Diner"
  },
  {
    "punchOut": 1782847800000,
    "note": "Diner",
    "punchIn": 1782821220000
  },
  {
    "note": "Diner",
    "punchIn": 1782908160000,
    "punchOut": 1782928320000
  },
  {
    "punchIn": 1782994608237,
    "note": "",
    "punchOut": 1783018559984
  },
  {
    "punchOut": 1783106640000,
    "note": "Diner",
    "punchIn": 1783081200000
  },
  {
    "note": "Diner",
    "punchOut": 1783366020000,
    "punchIn": 1783339680000
  },
  {
    "note": "Diner",
    "punchOut": 1783452900000,
    "punchIn": 1783426980000
  },
  {
    "punchIn": 1783513680000,
    "punchOut": 1783539600000,
    "note": "Diner"
  },
  {
    "punchOut": 1783626000000,
    "note": "Diner",
    "punchIn": 1783600200000
  },
  {
    "punchIn": 1783686600000,
    "note": "Oublie ",
    "punchOut": 1783712400000
  },
  {
    "note": "Diner",
    "punchOut": 1784575800000,
    "punchIn": 1784550060000
  },
  {
    "punchOut": 1784662200000,
    "note": "Diner",
    "punchIn": 1784635560000
  },
  {
    "punchOut": 1784749200000,
    "punchIn": 1784721420000,
    "note": "Diner"
  },
  {
    "punchOut": 1784835120000,
    "note": "Oublie punch diner",
    "punchIn": 1784809620000
  },
  {
    "punchIn": 1784895000000,
    "punchOut": 1784919180000,
    "note": "Diner"
  },
  {
    "punchOut": 1785180420000,
    "punchIn": 1785154200000,
    "note": "diner"
  },
  {
    "punchIn": 1785758400000,
    "note": "Bogue et dîner ",
    "punchOut": 1785787080000
  },
  {
    "punchIn": 1785845280000,
    "note": "Diner",
    "punchOut": 1785871800000
  },
  {
    "note": "Diner",
    "punchIn": 1785931260000,
    "punchOut": 1785958200000
  },
  {
    "punchOut": 1786044480000,
    "punchIn": 1786018140000,
    "note": "Diner"
  },
  {
    "note": "Diner",
    "punchIn": 1786103760000,
    "punchOut": 1786130340000
  },
  {
    "note": "Diner",
    "punchOut": 1786390200000,
    "punchIn": 1786363680000
  },
  {
    "note": "Diner",
    "punchIn": 1786448940000,
    "punchOut": 1786476720000
  },
  {
    "note": "Diner",
    "punchIn": 1786537200000,
    "punchOut": 1786563000000
  },
  {
    "punchIn": 1786622940000,
    "note": "Diner",
    "punchOut": 1786647600000
  },
  {
    "punchIn": 1786708980000,
    "punchOut": 1786735920000,
    "note": "Diner"
  },
  {
    "punchOut": 1786993800000,
    "note": "Diner",
    "punchIn": 1786968240000
  }
];

async function restorePunchData() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, DATABASE_ID);
    
    // Get existing data first (if any)
    const punchRef = doc(db, "punches", USER_UID);
    const existingDoc = await getDoc(punchRef);
    let existingSessions = [];
    
    if (existingDoc.exists()) {
      const existingData = existingDoc.data();
      existingSessions = existingData.sessions || [];
      console.log(`Found ${existingSessions.length} existing sessions`);
    }
    
    // Merge the lost data with existing data
    const allSessions = [...existingSessions, ...lostPunchData];
    
    // Remove duplicates based on punchIn timestamp
    const uniqueSessions = allSessions.filter((session, index, self) => 
      index === self.findIndex(s => s.punchIn === session.punchIn)
    );
    
    console.log(`Restoring ${lostPunchData.length} lost sessions`);
    console.log(`Total sessions after merge: ${uniqueSessions.length}`);
    
    // Update Firestore
    await setDoc(punchRef, { sessions: uniqueSessions }, { merge: true });
    
    console.log("✅ Punch data restored successfully!");
    
  } catch (error) {
    console.error("❌ Error restoring punch data:", error);
    process.exit(1);
  }
}

// Run the restoration
restorePunchData();