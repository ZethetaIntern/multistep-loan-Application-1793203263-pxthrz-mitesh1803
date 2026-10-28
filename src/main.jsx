import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "loanease-application-v1";

const steps = [
  "Loan Type", "Personal Details", "Employment", "Address",
  "Financials", "Documents", "Verification", "Review & Sign"
];

const initialData = {
  loanType: "Personal",
  loanAmount: "",
  tenure: "36",
  fullName: "",
  email: "",
  phone: "",
  dob: "",
  gender: "",
  pan: "",
  aadhaar: "",
  employmentType: "",
  company: "",
  monthlyIncome: "",
  experience: "",
  businessName: "",
  businessType: "",
  businessVintage: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  monthlyExpenses: "",
  existingEmi: "",
  bankAccount: "",
  consent: false,
  documents: [],
  panVerified: false,
  aadhaarVerified: false,
  signature: "",
};

function App() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialData; }
    catch { return initialData; }
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [savedAt, setSavedAt] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSavedAt(new Date().toLocaleTimeString());
  }, [data]);

  const update = (key, value) => setData(d => ({ ...d, [key]: value }));

  const updateLoanType = (type) => {
    setData(d => ({
      ...d, loanType: type,
      loanAmount: "", businessName: "", businessType: "", businessVintage: ""
    }));
  };

  const validate = (s = step) => {
    const e = {};
    if (s === 0) {
      if (!data.loanAmount || Number(data.loanAmount) <= 0) e.loanAmount = "Enter a valid loan amount.";
      if (!data.tenure) e.tenure = "Select a tenure.";
      if (data.loanType === "Home" && Number(data.loanAmount) < 500000) e.loanAmount = "Home loan amount should be at least ₹5,00,000.";
      if (data.loanType === "Business" && Number(data.loanAmount) < 100000) e.loanAmount = "Business loan amount should be at least ₹1,00,000.";
    }
    if (s === 1) {
      if (!data.fullName.trim()) e.fullName = "Full name is required.";
      if (!/^\S+@\S+\.\S+$/.test(data.email)) e.email = "Enter a valid email.";
      if (!/^[6-9]\d{9}$/.test(data.phone)) e.phone = "Enter a valid 10-digit mobile number.";
      if (!data.dob) e.dob = "Date of birth is required.";
      if (!data.gender) e.gender = "Select gender.";
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(data.pan.toUpperCase())) e.pan = "Enter a valid PAN format.";
      if (!/^\d{12}$/.test(data.aadhaar)) e.aadhaar = "Enter a valid 12-digit Aadhaar.";
    }
    if (s === 2) {
      if (!data.employmentType) e.employmentType = "Select employment type.";
      if (data.employmentType === "Salaried" && !data.company.trim()) e.company = "Company name is required.";
      if (data.employmentType === "Self Employed") {
        if (!data.businessName.trim()) e.businessName = "Business name is required.";
        if (!data.businessType) e.businessType = "Select business type.";
        if (!data.businessVintage) e.businessVintage = "Select business vintage.";
      }
      if (!data.monthlyIncome || Number(data.monthlyIncome) <= 0) e.monthlyIncome = "Enter monthly income.";
      if (!data.experience) e.experience = "Select experience.";
    }
    if (s === 3) {
      ["address","city","state","pincode"].forEach(k => { if (!String(data[k]).trim()) e[k] = "Required."; });
      if (data.pincode && !/^\d{6}$/.test(data.pincode)) e.pincode = "Enter a valid 6-digit PIN code.";
    }
    if (s === 4) {
      if (!data.monthlyExpenses || Number(data.monthlyExpenses) < 0) e.monthlyExpenses = "Enter monthly expenses.";
      if (data.existingEmi === "" || Number(data.existingEmi) < 0) e.existingEmi = "Enter existing EMI.";
      if (!/^\d{9,18}$/.test(data.bankAccount)) e.bankAccount = "Enter a valid bank account number.";
    }
    if (s === 5 && data.documents.length === 0) e.documents = "Upload at least one document.";
    if (s === 6) {
      if (!data.panVerified) e.panVerified = "Complete PAN verification.";
      if (!data.aadhaarVerified) e.aadhaarVerified = "Complete Aadhaar verification.";
    }
    if (s === 7) {
      if (!data.signature.trim()) e.signature = "Enter your e-signature.";
      if (!data.consent) e.consent = "You must accept the declaration.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(steps.length - 1, s + 1)); };
  const back = () => { setErrors({}); setStep(s => Math.max(0, s - 1)); };

  const verify = (type) => {
    const key = type === "PAN" ? "panVerified" : "aadhaarVerified";
    setData(d => ({ ...d, [key]: false }));
    setTimeout(() => setData(d => ({ ...d, [key]: true })), 900);
  };

  const handleFiles = (ev) => {
    const picked = [...ev.target.files];
    const accepted = picked.filter(f => f.size <= 5 * 1024 * 1024);
    setData(d => ({ ...d, documents: [...d.documents, ...accepted.map(f => ({ name: f.name, size: f.size }))] }));
  };

  const removeFile = (name) => update("documents", data.documents.filter(f => f.name !== name));

  const emi = useMemo(() => {
    const p = Number(data.loanAmount);
    const n = Number(data.tenure);
    if (!p || !n) return 0;
    const r = 0.12 / 12;
    return Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }, [data.loanAmount, data.tenure]);

  const dti = useMemo(() => {
    const income = Number(data.monthlyIncome);
    if (!income) return 0;
    return Math.round(((Number(data.existingEmi) || 0) + emi) / income * 100);
  }, [data.monthlyIncome, data.existingEmi, emi]);

  const submit = () => {
    if (!validate(7)) return;
    setSubmitted(true);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (submitted) return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h1>Application Submitted</h1>
        <p>Your loan application has been successfully submitted for pre-approval review.</p>
        <div className="application-id">Application ID: LE-{Date.now().toString().slice(-8)}</div>
        <button onClick={() => window.location.reload()}>Start New Application</button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span>₹</span> LoanEase</div>
        <div className="save">Auto-saved {savedAt ? `at ${savedAt}` : ""}</div>
      </header>

      <main className="container">
        <div className="hero">
          <div>
            <p className="eyebrow">DIGITAL LOAN APPLICATION</p>
            <h1>Apply for your loan</h1>
            <p>Complete the steps below. Your progress is automatically saved.</p>
          </div>
          <div className="loan-badge">{data.loanType} Loan</div>
        </div>

        <div className="progress">
          {steps.map((name, i) => (
            <button key={name} className={`progress-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              onClick={() => i < step && setStep(i)}>
              <span>{i < step ? "✓" : i + 1}</span><small>{name}</small>
            </button>
          ))}
        </div>

        <section className="card">
          {step === 0 && <LoanType data={data} update={update} updateLoanType={updateLoanType} errors={errors} />}
          {step === 1 && <Personal data={data} update={update} errors={errors} />}
          {step === 2 && <Employment data={data} update={update} errors={errors} />}
          {step === 3 && <Address data={data} update={update} errors={errors} />}
          {step === 4 && <Financials data={data} update={update} errors={errors} emi={emi} dti={dti} />}
          {step === 5 && <Documents data={data} handleFiles={handleFiles} removeFile={removeFile} errors={errors} />}
          {step === 6 && <Verification data={data} verify={verify} errors={errors} />}
          {step === 7 && <Review data={data} update={update} emi={emi} dti={dti} errors={errors} />}

          <div className="actions">
            <button className="secondary" onClick={back} disabled={step === 0}>← Back</button>
            {step < 7 ? <button className="primary" onClick={next}>Save & Continue →</button>
              : <button className="primary" onClick={submit}>Submit Application ✓</button>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({label, error, children, hint}) {
  return <div className="field"><label>{label}</label>{children}{hint && <small className="hint">{hint}</small>}{error && <small className="error">{error}</small>}</div>;
}
const Input = ({...p}) => <input {...p} />;
const Select = ({children, ...p}) => <select {...p}>{children}</select>;

function LoanType({data, update, updateLoanType, errors}) {
  return <div>
    <StepHead title="Choose your loan" text="Select the loan product that best matches your requirement." />
    <div className="loan-grid">
      {["Personal","Home","Business"].map(t => <button key={t} className={`loan-option ${data.loanType===t?"selected":""}`} onClick={() => updateLoanType(t)}>
        <div className="option-icon">{t==="Personal"?"👤":t==="Home"?"🏠":"💼"}</div><b>{t} Loan</b><span>{t==="Personal"?"For personal expenses":t==="Home"?"For buying or constructing a home":"For business expansion"}</span></button>)}
    </div>
    <div className="form-grid">
      <Field label="Requested loan amount" error={errors.loanAmount}><div className="input-prefix"><span>₹</span><Input type="number" value={data.loanAmount} onChange={e=>update("loanAmount",e.target.value)} placeholder="e.g. 500000" /></div></Field>
      <Field label="Repayment tenure" error={errors.tenure}><Select value={data.tenure} onChange={e=>update("tenure",e.target.value)}>{[12,24,36,48,60,84,120].map(x=><option key={x} value={x}>{x} months</option>)}</Select></Field>
    </div>
    <div className="info">💡 Indicative interest rate: <b>12% p.a.</b> Final rate depends on eligibility and lender policy.</div>
  </div>;
}

function Personal({data,update,errors}) {
  return <div><StepHead title="Personal details" text="Tell us about yourself so we can verify your identity." />
    <div className="form-grid">
      <Field label="Full name" error={errors.fullName}><Input value={data.fullName} onChange={e=>update("fullName",e.target.value)} placeholder="As per PAN" /></Field>
      <Field label="Email address" error={errors.email}><Input type="email" value={data.email} onChange={e=>update("email",e.target.value)} placeholder="you@example.com" /></Field>
      <Field label="Mobile number" error={errors.phone}><Input value={data.phone} maxLength="10" onChange={e=>update("phone",e.target.value.replace(/\D/g,""))} placeholder="10-digit mobile" /></Field>
      <Field label="Date of birth" error={errors.dob}><Input type="date" value={data.dob} onChange={e=>update("dob",e.target.value)} /></Field>
      <Field label="Gender" error={errors.gender}><Select value={data.gender} onChange={e=>update("gender",e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></Select></Field>
      <Field label="PAN" error={errors.pan}><Input value={data.pan} maxLength="10" onChange={e=>update("pan",e.target.value.toUpperCase())} placeholder="ABCDE1234F" /></Field>
      <Field label="Aadhaar number" error={errors.aadhaar}><Input value={data.aadhaar} maxLength="12" onChange={e=>update("aadhaar",e.target.value.replace(/\D/g,""))} placeholder="12-digit Aadhaar" /></Field>
    </div>
  </div>;
}

function Employment({data,update,errors}) {
  return <div><StepHead title="Employment & income" text="Your employment information helps determine eligibility." />
    <div className="form-grid">
      <Field label="Employment type" error={errors.employmentType}><Select value={data.employmentType} onChange={e=>update("employmentType",e.target.value)}><option value="">Select</option><option>Salaried</option><option>Self Employed</option><option>Student</option><option>Retired</option></Select></Field>
      {data.employmentType === "Salaried" && <Field label="Company / employer" error={errors.company}><Input value={data.company} onChange={e=>update("company",e.target.value)} placeholder="Company name" /></Field>}
      {data.employmentType === "Self Employed" && <>
        <Field label="Business name" error={errors.businessName}><Input value={data.businessName} onChange={e=>update("businessName",e.target.value)} /></Field>
        <Field label="Business type" error={errors.businessType}><Select value={data.businessType} onChange={e=>update("businessType",e.target.value)}><option value="">Select</option><option>Proprietorship</option><option>Partnership</option><option>Private Limited</option><option>LLP</option></Select></Field>
        <Field label="Business vintage" error={errors.businessVintage}><Select value={data.businessVintage} onChange={e=>update("businessVintage",e.target.value)}><option value="">Select</option><option>Less than 1 year</option><option>1-3 years</option><option>3-5 years</option><option>5+ years</option></Select></Field>
      </>}
      <Field label="Monthly income" error={errors.monthlyIncome}><div className="input-prefix"><span>₹</span><Input type="number" value={data.monthlyIncome} onChange={e=>update("monthlyIncome",e.target.value)} placeholder="e.g. 40000" /></div></Field>
      <Field label="Total work experience" error={errors.experience}><Select value={data.experience} onChange={e=>update("experience",e.target.value)}><option value="">Select</option><option>Less than 1 year</option><option>1-3 years</option><option>3-5 years</option><option>5+ years</option></Select></Field>
    </div>
  </div>;
}

function Address({data,update,errors}) {
  const suggestions = ["Hyderabad, Telangana","Bengaluru, Karnataka","Chennai, Tamil Nadu","Mumbai, Maharashtra","Pune, Maharashtra"];
  return <div><StepHead title="Address details" text="Provide your current residential address." />
    <Field label="Address" error={errors.address}><Input value={data.address} onChange={e=>update("address",e.target.value)} placeholder="House no., street, locality" /></Field>
    <div className="suggestions">{suggestions.map(s=><button key={s} onClick={()=>{const [c,st]=s.split(", "); update("city",c);update("state",st)}}>📍 {s}</button>)}</div>
    <div className="form-grid">
      <Field label="City" error={errors.city}><Input value={data.city} onChange={e=>update("city",e.target.value)} /></Field>
      <Field label="State" error={errors.state}><Input value={data.state} onChange={e=>update("state",e.target.value)} /></Field>
      <Field label="PIN code" error={errors.pincode}><Input value={data.pincode} maxLength="6" onChange={e=>update("pincode",e.target.value.replace(/\D/g,""))} /></Field>
    </div>
  </div>;
}

function Financials({data,update,errors,emi,dti}) {
  return <div><StepHead title="Financial information" text="Enter your monthly obligations and bank details." />
    <div className="form-grid">
      <Field label="Monthly household expenses" error={errors.monthlyExpenses}><div className="input-prefix"><span>₹</span><Input type="number" value={data.monthlyExpenses} onChange={e=>update("monthlyExpenses",e.target.value)} /></div></Field>
      <Field label="Existing EMIs" error={errors.existingEmi}><div className="input-prefix"><span>₹</span><Input type="number" value={data.existingEmi} onChange={e=>update("existingEmi",e.target.value)} /></div></Field>
      <Field label="Bank account number" error={errors.bankAccount}><Input value={data.bankAccount} onChange={e=>update("bankAccount",e.target.value.replace(/\D/g,""))} /></Field>
    </div>
    <div className="summary-grid">
      <div><span>Estimated EMI</span><b>₹{emi.toLocaleString("en-IN")}</b></div>
      <div><span>Debt-to-income</span><b>{dti}%</b></div>
      <div><span>Tenure</span><b>{data.tenure} months</b></div>
    </div>
  </div>;
}

function Documents({data,handleFiles,removeFile,errors}) {
  return <div><StepHead title="Upload documents" text="Upload supporting documents. Maximum file size: 5 MB each." />
    <div className="upload"><div className="upload-icon">☁️</div><h3>Drag & drop or browse files</h3><p>PDF, JPG or PNG</p><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFiles}/></div>
    {errors.documents && <div className="error">{errors.documents}</div>}
    <div className="file-list">{data.documents.map(f=><div className="file-row" key={f.name}><span>📄 {f.name}</span><small>{(f.size/1024).toFixed(0)} KB</small><button onClick={()=>removeFile(f.name)}>Remove</button></div>)}</div>
    <div className="info">Recommended: PAN card, address proof, income proof, and bank statement.</div>
  </div>;
}

function Verification({data,verify,errors}) {
  return <div><StepHead title="Identity verification" text="Simulation of PAN and Aadhaar verification for this demo." />
    <div className="verify-grid">
      {["PAN","Aadhaar"].map(type=>{const ok=type==="PAN"?data.panVerified:data.aadhaarVerified; return <div className="verify-card" key={type}><div className="verify-title"><b>{type} verification</b><span className={ok?"verified":"pending"}>{ok?"Verified":"Pending"}</span></div><p>{ok?"Identity successfully verified.":"Click below to simulate an OTP/API verification."}</p><button className="secondary" onClick={()=>verify(type)}>{ok?"Verify again":"Verify now"}</button>{errors[type==="PAN"?"panVerified":"aadhaarVerified"]&&<small className="error">{errors[type==="PAN"?"panVerified":"aadhaarVerified"]}</small>}</div>})}
    </div>
    <div className="info">🔒 No real PAN/Aadhaar API is connected. This screen is only a verification simulation.</div>
  </div>;
}

function Review({data,update,emi,dti,errors}) {
  return <div><StepHead title="Review & e-sign" text="Check your information before submitting the application." />
    <div className="review">
      <ReviewBlock title="Loan" rows={[["Type",data.loanType],["Amount","₹"+Number(data.loanAmount||0).toLocaleString("en-IN")],["Tenure",data.tenure+" months"],["Estimated EMI","₹"+emi.toLocaleString("en-IN")]]}/>
      <ReviewBlock title="Applicant" rows={[["Name",data.fullName],["Email",data.email],["Phone",data.phone],["PAN",data.pan]]}/>
      <ReviewBlock title="Employment" rows={[["Type",data.employmentType],["Company / Business",data.company||data.businessName||"—"],["Monthly income","₹"+Number(data.monthlyIncome||0).toLocaleString("en-IN")]]}/>
      <ReviewBlock title="Address" rows={[["Address",data.address],["City",data.city],["State",data.state],["PIN",data.pincode]]}/>
      <ReviewBlock title="Documents & verification" rows={[["Documents",data.documents.length+" file(s)"],["PAN","Verified"],["Aadhaar","Verified"],["DTI",dti+"%"]]}/>
    </div>
    <Field label="E-signature" error={errors.signature} hint="Type your full name as your electronic signature."><Input value={data.signature} onChange={e=>update("signature",e.target.value)} placeholder="Your full name" /></Field>
    <label className="check"><input type="checkbox" checked={data.consent} onChange={e=>update("consent",e.target.checked)} /> I confirm that the information provided is accurate and I agree to the loan application terms and electronic processing.</label>
    {errors.consent && <small className="error">{errors.consent}</small>}
  </div>;
}
function ReviewBlock({title,rows}) { return <div className="review-block"><h3>{title}</h3>{rows.map(([a,b])=><div className="review-row" key={a}><span>{a}</span><b>{b||"—"}</b></div>)}</div>; }
function StepHead({title,text}) { return <div className="step-head"><h2>{title}</h2><p>{text}</p></div>; }

createRoot(document.getElementById("root")).render(<App />);
