import React from "react";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };
type AreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #333",
  borderRadius: 2,
  fontSize: 14,
  outline: "none",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 700,
  margin: "16px 0 8px",
  fontSize: 15,
};

const Field: React.FC<FieldProps> = ({ label, ...props }) => (
  <div>
    <div style={labelStyle}>{label}</div>
    <input style={inputStyle} {...props} />
  </div>
);

const Area: React.FC<AreaProps> = ({ label, rows = 3, ...props }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={labelStyle}>{label}</div>
    <textarea style={{ ...inputStyle, resize: "vertical" }} rows={rows} {...props} />
  </div>
);

const VitalBox: React.FC<{ label: string; placeholder?: string }> = ({ label, placeholder }) => (
  <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 6 }}>
    <div style={{ ...labelStyle, fontWeight: 600 }}>{label}</div>
    <input style={inputStyle} placeholder={placeholder} />
  </div>
);

export default function HospitalForm() {
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Form captured. Connect to backend or state as needed.");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 16, background: "#f7f7f7" }}>
      <form
        onSubmit={onSubmit}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 860,
          border: "2px solid #222",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          padding: 18,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 1, textTransform: "uppercase" }}>
            Cheema Heart Complex & General Hospital
          </div>
        </div>

        {/* MR Number / Date */}
        <div style={rowStyle}>
          <Field label="MR Number:" placeholder="Enter MR Number" />
          <Field label="Date:" type="date" />
        </div>

        {/* Patient name / Time */}
        <div style={rowStyle}>
          <Field label="Patient name:" placeholder="Enter patient name" />
          <Field label="Time:" type="time" />
        </div>

        <Area label="Presenting Complaints:" rows={3} placeholder="Details..." />
        <Area label="Reason of Admission:" rows={2} placeholder="Details..." />
        <Area label="Medication History:" rows={2} placeholder="Details..." />
        <Area label="Family History:" rows={2} placeholder="Details..." />
        <Area label="Allergies:" rows={2} placeholder="Details..." />

        {/* Vitals */}
        <div style={sectionTitle}>Vitals</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 10 }}>
          <VitalBox label="Pulse:" placeholder="bpm" />
          <VitalBox label="Temp:" placeholder="°C/°F" />
          <VitalBox label="BP:" placeholder="mmHg" />
          <VitalBox label="R/R:" placeholder="breaths/min" />
        </div>

        <Area label="General Physical Examination:" rows={3} placeholder="Findings..." />
        <Area label="Provisional Diagnosis:" rows={2} placeholder="Details..." />
        <Area label="Investigations:" rows={2} placeholder="Details..." />
        <Area label="Final Diagnosis:" rows={2} placeholder="Details..." />

        {/* Nutritional Status */}
        <div style={sectionTitle}>Nutritional Status</div>
        <div style={rowStyle}>
          <Field label="Weight:" placeholder="kg" />
          <Field label="Height:" placeholder="cm" />
        </div>

        <Area label="Advised Diet:" rows={2} placeholder="Details..." />
        <Area label="Treatment Plan:" rows={3} placeholder="Plan..." />

        {/* Footer */}
        <div style={{ borderTop: "1px solid #333", margin: "10px 0" }} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 12,
            alignItems: "end",
            marginTop: 6,
          }}
        >
          <Field label="Doctor Name:" placeholder="Enter doctor name" />
          <Field label="Sign:" placeholder="Sign" />
          <Field label="Date:" type="date" />
          <Field label="Time:" type="time" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              borderRadius: 3,
            }}
          >
            Save
          </button>
        </div>
        
      </form>
    </div>
  );
}

// Page 13 - FOR DOCTOR'S NOTES ONLY (duplicate of page 14)
export function DoctorsNotesPage13() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 18, textAlign: 'center', marginBottom: 8 };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;

  const TopInfo = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Date</div>
        <div style={line} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Patient's Progress Notes</div>
        <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ width: 18, height: 18, border: '1px solid #333' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Name</div>
        <div style={line} />
        <div style={{ fontWeight: 700 }}>Regd. No.</div>
        <div style={line} />
      </div>
    </div>
  );

  const RuledArea = () => (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(20, 1fr)', rowGap: 12 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ borderBottom: '1px solid #333', height: 18 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 0, borderLeft: '1px solid #333' }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>FOR DOCTOR'S NOTES ONLY</div>
        <TopInfo />
        <RuledArea />
        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>13</div>
      </div>
    </div>
  );
}

// Page 31 - Inventory List
export function InventoryListPage31() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 20, color: '#111' };
  const line = { borderBottom: '1px solid #333', minHeight: 18 } as React.CSSProperties;
  const box: React.CSSProperties = { width: 22, height: 22, border: '1px solid #333', borderRadius: 2 };

  const Title = () => (
    <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, marginBottom: 14 }}>
      <div>Inventory List</div>
      <div style={{ width: 160, height: 2, background: '#333', margin: '6px auto 0' }} />
    </div>
  );

  const Row = ({ label, replaceOneWithBox = false }: { label: string; replaceOneWithBox?: boolean }) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '160px 1fr 24px 1fr 26px',
      alignItems: 'center',
      columnGap: 10,
      margin: '8px 0',
      minHeight: 28
    }}>
      <div style={{ whiteSpace: 'nowrap' }}>{label}</div>
      <div style={line} />
      {replaceOneWithBox ? (
        <div style={box} />
      ) : (
        <div style={{ textAlign: 'center', fontWeight: 400, fontSize: 16, lineHeight: '1' }}>1</div>
      )}
      <div style={line} />
      <div style={box} />
    </div>
  );

  const items = [
    'Blanket',
    'Bed Sheet',
    'Pillow',
    'Monitor Cardiac',
    'Led T.V',
    'T.V Remort',
    'Bed',
    'Matras',
    'Others',
    '',
    '',
  ];

  return (
    <div style={container}>
      <div style={page}>
        <Title />
        <div>
          {items.map((it, i) => (
            <Row key={i} label={it} replaceOneWithBox={i >= items.length - 3} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto', alignItems: 'end', gap: 10, marginTop: 18 }}>
          <div>Staff Name & Signs</div>
          <div style={line} />
          <div>Date & Time</div>
          <div style={line} />
          <div style={box} />
        </div>
        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>31</div>
      </div>
    </div>
  );
}

// Page 30 - CHECK LIST OF SURGICAL ITEMS PRE & POST SURGERY (Continuation)
export function SurgicalItemsChecklistPage30() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;

  const HospitalHeader = () => (
    <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, letterSpacing: 0.5, marginBottom: 4 }}>
      CHEEMA HEART COMPLEX & GENERAL hOSPITAL
    </div>
  );

  const Title = () => (
    <div style={{ textAlign: 'center', fontWeight: 900, margin: '6px 0 8px', textDecoration: 'underline' }}>
      CHECK LIST OF SURGICAL ITEMS PRE & POST SURGERY
    </div>
  );

  const TopLines = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr auto 1fr auto 1fr', alignItems: 'end', gap: 8, marginBottom: 10 }}>
      <div>Date</div><div style={line} />
      <div>Case #</div><div style={line} />
      <div>MR #</div><div style={line} />
      <div>Pt Name</div><div style={line} />
      <div>Sex/Age</div><div style={line} />
      <div style={{ gridColumn: '1 / -1', marginTop: 6, display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr', alignItems: 'end', gap: 8 }}>
        <div>Surgeon</div><div style={line} />
        <div>Anesthetist</div><div style={line} />
        <div>Assistant</div><div style={line} />
      </div>
    </div>
  );

  // Keep structure identical; rows can be empty for continuation usage
  const leftItems = new Array(25).fill('');
  const rightItems = new Array(25).fill('');

  const HeadRow = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 110px 110px' }}>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Sr#</div>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Items</div>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 700, textAlign: 'center' }}>Pre Surgery</div>
      <div style={{ borderBottom: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 700, textAlign: 'center' }}>Post Surgery</div>
    </div>
  );

  const Row = ({ idx, text }: { idx: number; text: string }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 110px 110px' }}>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, padding: '4px 6px' }}>{String(idx).padStart(2,'0')}</div>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, padding: '4px 6px' }}>{text}</div>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, minHeight: 26 }} />
      <div style={{ borderBottom: tableBorder, minHeight: 26 }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <HospitalHeader />
        <Title />
        <TopLines />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Left Table */}
          <div style={{ borderLeft: tableBorder, borderRight: tableBorder }}>
            <HeadRow />
            {leftItems.map((t, i) => (
              <Row key={i} idx={i + 1} text={t} />
            ))}
          </div>

          {/* Right Table */}
          <div style={{ borderLeft: tableBorder, borderRight: tableBorder }}>
            <HeadRow />
            {rightItems.map((t, i) => (
              <Row key={i} idx={i + 26} text={t} />
            ))}
          </div>
        </div>

        {/* Bottom lines */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr', alignItems: 'end', gap: 8 }}>
            <div>Checked By</div><div style={line} />
            <div>Batch #</div><div style={line} />
            <div>Name & Sig</div><div style={line} />
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>30</div>
      </div>
    </div>
  );
}

// Page 29 - CHECK LIST OF SURGICAL ITEMS PRE & POST SURGERY
export function SurgicalItemsChecklistPage29() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;

  const HospitalHeader = () => (
    <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, letterSpacing: 0.5, marginBottom: 4 }}>
      CHEEMA HEART COMPLEX & GENERAL hOSPITAL
    </div>
  );

  const Title = () => (
    <div style={{ textAlign: 'center', fontWeight: 900, margin: '6px 0 8px', textDecoration: 'underline' }}>
      CHECK LIST OF SURGICAL ITEMS PRE & POST SURGERY
    </div>
  );

  const TopLines = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr auto 1fr auto 1fr', alignItems: 'end', gap: 8, marginBottom: 10 }}>
      <div>Date</div><div style={line} />
      <div>Case #</div><div style={line} />
      <div>MR #</div><div style={line} />
      <div>Pt Name</div><div style={line} />
      <div>Sex/Age</div><div style={line} />
      <div style={{ gridColumn: '1 / -1', marginTop: 6, display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr', alignItems: 'end', gap: 8 }}>
        <div>Surgeon</div><div style={line} />
        <div>Anesthetist</div><div style={line} />
        <div>Assistant</div><div style={line} />
      </div>
    </div>
  );

  const leftItems = [
    'Towel Clips','Allis Forceps','Bebcock Forceps','Long Artery Forceps','Medium Artery Forceps','Sponge Holder','Bowel','Plain Forceps','Toothed Forceps','Needle Holder','Dissecting Scissors','BP Handel','R Angle Retractor','Sheet','Sponges','RB Gauze','Lega clips','Suture With Needle','Suction Nozzle','Suction Pipe','Nelton Catheter','Suction Drain','Surgical Blade','Skin Stapler','S Gloves'
  ];
  const rightItems = [
    'Lahys For…','Trocar 10mm','Trocar 5mm','Mechentosh Sheet','Clip Applicator','Graspers','Diathermy Lead','K Wire','Nail','Ostnomore','Drill Bits','Plair','Screws','Wires','Wire Cutter','Humen Retractor','Mesh 6X11,15X15','','','','','','','',
  ];

  const HeadRow = ({ sr }: { sr: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: sr ? '50px 1fr 110px 110px' : '50px 1fr 110px 110px' }}>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Sr#</div>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Items</div>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 700, textAlign: 'center' }}>Pre Surgery</div>
      <div style={{ borderBottom: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 700, textAlign: 'center' }}>Post Surgery</div>
    </div>
  );

  const Row = ({ idx, text }: { idx: number; text: string }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 110px 110px' }}>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, padding: '4px 6px' }}>{String(idx).padStart(2,'0')}</div>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, padding: '4px 6px' }}>{text}</div>
      <div style={{ borderRight: tableBorder, borderBottom: tableBorder, minHeight: 26 }} />
      <div style={{ borderBottom: tableBorder, minHeight: 26 }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <HospitalHeader />
        <Title />
        <TopLines />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Left Table */}
          <div style={{ borderLeft: tableBorder, borderRight: tableBorder }}>
            <HeadRow sr />
            {leftItems.map((t, i) => (
              <Row key={i} idx={i + 1} text={t} />
            ))}
          </div>

          {/* Right Table */}
          <div style={{ borderLeft: tableBorder, borderRight: tableBorder }}>
            <HeadRow sr />
            {rightItems.map((t, i) => (
              <Row key={i} idx={i + 26} text={t} />
            ))}
          </div>
        </div>

        {/* Bottom lines */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr', alignItems: 'end', gap: 8 }}>
            <div>Checked By</div><div style={line} />
            <div>Batch #</div><div style={line} />
            <div>Name & Sig</div><div style={line} />
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>29</div>
      </div>
    </div>
  );
}

// Page 28 - DAILY PROGRESS SHEET (Continuation)
export function DailyProgressSheetPage28() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;

  const HospitalHeader = () => (
    <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 18, letterSpacing: 0.5, marginBottom: 8 }}>
      CHEEMA HEART COMPLEX & GENERAL HOSPITAL
    </div>
  );

  const TopBoxes = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 220px', gap: 8, alignItems: 'stretch', marginBottom: 8 }}>
      <div style={{ border: tableBorder }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>MR Number:</div>
          <div />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Patient Name</div>
          <div />
        </div>
      </div>

      <div />

      <div style={{ border: tableBorder }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Date:</div>
          <div />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr' }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Time:</div>
          <div />
        </div>
      </div>
    </div>
  );

  const SectionTitle: React.FC<{ text: string; withSign?: boolean }> = ({ text, withSign = true }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 220px', alignItems: 'end', gap: 8, marginTop: 8 }}>
      <div style={{ fontWeight: 700 }}>{text}</div>
      <div />
      {withSign ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 6 }}>
          <div>Sign:</div>
          <div style={line} />
        </div>
      ) : (
        <div />
      )}
    </div>
  );

  const RuledBlock: React.FC<{ rows?: number; tall?: boolean }> = ({ rows = 6, tall }) => (
    <div style={{ marginTop: 4, borderLeft: tableBorder, borderRight: tableBorder, borderTop: tableBorder }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ borderBottom: tableBorder, minHeight: tall ? 32 : 26 }} />
      ))}
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <HospitalHeader />
        <TopBoxes />
        <div style={{ textAlign: 'center', fontWeight: 800, margin: '4px 0 6px' }}>DAILY PROGRESS SHEET</div>

        {/* Morning */}
        <SectionTitle text="Morning Nursing Notes:" />
        <RuledBlock rows={6} tall />

        {/* Evening */}
        <SectionTitle text="Evening Nursing Notes:" />
        <RuledBlock rows={6} tall />

        {/* Night */}
        <SectionTitle text="Night Nursing Notes:" withSign={false} />
        <RuledBlock rows={6} tall />

        {/* Charge Nurse Sign */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 200px', alignItems: 'end', gap: 8, marginTop: 10 }}>
          <div />
          <div style={{ fontWeight: 700 }}>C/N Sign:</div>
          <div style={line} />
        </div>

        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>28</div>
      </div>
    </div>
  );
}

// Page 27 - MONITORING CHART (Continuation)
export function MonitoringChartPage27() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 20, textAlign: 'center', marginBottom: 6, letterSpacing: 0.5 };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;

  const PatientLine = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 160px auto 160px', alignItems: 'end', gap: 8, marginBottom: 8 }}>
      <div style={{ fontWeight: 700 }}>Pt Name:</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>MR #:</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>Date:</div>
      <div style={line} />
    </div>
  );

  const headersLeft = ['Time', 'B.P', 'PR', 'RR', 'O2%', 'Temp'];
  const timesTop = ['08AM','09AM','10AM','11AM','12MD','01PM','02PM'];
  const timesMid = ['03PM','04PM','05PM','06PM','07PM','08PM'];
  const timesBottom = ['09PM','10PM','11PM','12MN','01AM','02AM','03AM','04AM','05AM','06AM','07AM'];

  const GridHeader = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      {headersLeft.map((h, i) => (
        <div key={i} style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>{h}</div>
      ))}
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>INTAKE</div>
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>ASP</div>
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>Urine</div>
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>Drain</div>
      <div style={{ borderTop: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>Nursing Sign.</div>
    </div>
  );

  const GridRow = ({ timeLabel, isTotal = false }: { timeLabel: string; isTotal?: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: isTotal ? 700 : 400 }}>{timeLabel}</div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderTop: tableBorder, minHeight: 26 }} />
    </div>
  );

  const TotalRow = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      <div style={{ borderRight: tableBorder, borderTop: '2px solid #333', borderBottom: tableBorder, padding: '4px 6px', fontWeight: 900 }}>TOTAL</div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: '2px solid #333', borderBottom: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderRight: tableBorder, borderTop: '2px solid #333', borderBottom: tableBorder, minHeight: 26 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: '2px solid #333', borderBottom: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderTop: '2px solid #333', borderBottom: tableBorder, minHeight: 26 }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>MONITORING CHART</div>
        <PatientLine />
        <div>
          <GridHeader />
          {timesTop.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
          {timesMid.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
          {timesBottom.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8, marginBottom: 8 }}>
            <div>24hourASP:</div>
            <div style={line} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 200px auto 200px', alignItems: 'end', gap: 8, marginBottom: 8 }}>
            <div>24hour Intake:</div>
            <div style={line} />
            <div>24hour Output Intake:</div>
            <div style={line} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 200px auto 200px', alignItems: 'end', gap: 8 }}>
            <div>24hour Drain1:</div>
            <div style={line} />
            <div>24hour Drain2:</div>
            <div style={line} />
          </div>
        </div>
        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>27</div>
      </div>
    </div>
  );
}

// Page 26 - DAILY PROGRESS SHEET (Continuation)
export function DailyProgressSheetPage26() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;

  const HospitalHeader = () => (
    <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 18, letterSpacing: 0.5, marginBottom: 8 }}>
      CHEEMA HEART COMPLEX & GENERAL HOSPITAL
    </div>
  );

  const TopBoxes = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 220px', gap: 8, alignItems: 'stretch', marginBottom: 8 }}>
      <div style={{ border: tableBorder }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>MR Number:</div>
          <div />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Patient Name</div>
          <div />
        </div>
      </div>

      <div />

      <div style={{ border: tableBorder }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Date:</div>
          <div />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr' }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Time:</div>
          <div />
        </div>
      </div>
    </div>
  );

  const SectionTitle: React.FC<{ text: string }> = ({ text }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 220px', alignItems: 'end', gap: 8, marginTop: 8 }}>
      <div style={{ fontWeight: 700 }}>{text}</div>
      <div />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 6 }}>
        <div>Sign:</div>
        <div style={line} />
      </div>
    </div>
  );

  const RuledBlock: React.FC<{ rows?: number; tall?: boolean }> = ({ rows = 6, tall }) => (
    <div style={{ marginTop: 4, borderLeft: tableBorder, borderRight: tableBorder, borderTop: tableBorder }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ borderBottom: tableBorder, minHeight: tall ? 32 : 26 }} />
      ))}
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <HospitalHeader />
        <TopBoxes />
        <div style={{ textAlign: 'center', fontWeight: 800, margin: '4px 0 6px' }}>DAILY PROGRESS SHEET</div>

        {/* Morning */}
        <SectionTitle text="Morning Nursing Notes:" />
        <RuledBlock rows={7} tall />

        {/* Evening */}
        <SectionTitle text="Evening Nursing Notes:" />
        <RuledBlock rows={6} tall />

        {/* Night */}
        <SectionTitle text="Night Nursing Notes:" />
        <RuledBlock rows={6} tall />

        {/* Charge Nurse Sign */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 200px', alignItems: 'end', gap: 8, marginTop: 10 }}>
          <div />
          <div style={{ fontWeight: 700 }}>C/N Sign:</div>
          <div style={line} />
        </div>

        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>26</div>
      </div>
    </div>
  );
}

// Page 25 - MONITORING CHART (Continuation)
export function MonitoringChartPage25() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 20, textAlign: 'center', marginBottom: 6, letterSpacing: 0.5 };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;

  const PatientLine = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 160px auto 160px', alignItems: 'end', gap: 8, marginBottom: 8 }}>
      <div style={{ fontWeight: 700 }}>Pt Name:</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>MR #:</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>Date:</div>
      <div style={line} />
    </div>
  );

  const headersLeft = ['Time', 'B.P', 'PR', 'RR', 'O2%', 'Temp'];
  const timesTop = ['08AM','09AM','10AM','11AM','12MD','01PM','02PM'];
  const timesMid = ['03PM','04PM','05PM','06PM','07PM','08PM'];
  const timesBottom = ['09PM','10PM','11PM','12MN','01AM','02AM','03AM','04AM','05AM','06AM','07AM'];

  const GridHeader = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      {headersLeft.map((h, i) => (
        <div key={i} style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>{h}</div>
      ))}
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>INTAKE</div>
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>Out Put</div>
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>Urine</div>
      <div style={{ borderTop: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>Nursing Sign.</div>
    </div>
  );

  const GridRow = ({ timeLabel, isTotal = false }: { timeLabel: string; isTotal?: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: isTotal ? 700 : 400 }}>{timeLabel}</div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderTop: tableBorder, minHeight: 26 }} />
    </div>
  );

  const TotalRow = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 800 }}>TOTAL</div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderTop: tableBorder, minHeight: 26 }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>MONITORING CHART</div>
        <PatientLine />
        <div>
          <GridHeader />
          {timesTop.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
          {timesMid.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
          {timesBottom.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8, marginBottom: 8 }}>
            <div>24hourASP:</div>
            <div style={line} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 200px auto 200px', alignItems: 'end', gap: 8, marginBottom: 8 }}>
            <div>24hour Intake:</div>
            <div style={line} />
            <div>24hour Output Intake:</div>
            <div style={line} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 200px auto 200px', alignItems: 'end', gap: 8 }}>
            <div>24hour Drain1:</div>
            <div style={line} />
            <div>24hour Drain2:</div>
            <div style={line} />
          </div>
        </div>
        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>25</div>
      </div>
    </div>
  );
}

// Page 23 - MONITORING CHART
export function MonitoringChartPage23() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 20, textAlign: 'center', marginBottom: 6, letterSpacing: 0.5 };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;

  const PatientLine = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 160px auto 160px', alignItems: 'end', gap: 8, marginBottom: 8 }}>
      <div style={{ fontWeight: 700 }}>Pt Name:</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>MR #:</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>Date:</div>
      <div style={line} />
    </div>
  );

  const headersLeft = ['Time', 'B.P', 'PR', 'RR', 'O2%', 'Temp'];
  const outHeaders = ['ASP', 'Drain', 'Urine'];
  const timesTop = ['08AM','09AM','10AM','11AM','12MD','01PM','02PM'];
  const timesMid = ['03PM','04PM','05PM','06PM','07PM','08PM'];
  const timesBottom = ['09PM','10PM','11PM','12MN','01AM','02AM','03AM','04AM','05AM','06AM','07AM'];

  const GridHeader = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      {headersLeft.map((h, i) => (
        <div key={i} style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>{h}</div>
      ))}
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>INTAKE</div>
      <div style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>Out Put</div>
      {outHeaders.slice(1).map((h, i) => (
        <div key={i} style={{ borderTop: tableBorder, borderRight: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{h}</div>
      ))}
      <div style={{ borderTop: tableBorder, padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>Nursing Sign.</div>
    </div>
  );

  const GridRow = ({ timeLabel, isTotal = false }: { timeLabel: string; isTotal?: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      {/* Time */}
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: isTotal ? 700 : 400 }}>{timeLabel}</div>
      {/* B.P, PR, RR, O2%, Temp */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      {/* INTAKE big cell */}
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      {/* Out Put (ASP, Drain, Urine) */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      {/* Nursing Sign */}
      <div style={{ borderTop: tableBorder, minHeight: 26 }} />
    </div>
  );

  const TotalRow = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 60px) 1fr repeat(3, 70px) 90px', borderLeft: tableBorder, borderRight: tableBorder }}>
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, padding: '4px 6px', fontWeight: 800 }}>TOTAL</div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ borderRight: tableBorder, borderTop: tableBorder, minHeight: 26 }} />
      ))}
      <div style={{ borderTop: tableBorder, minHeight: 26 }} />
    </div>
  );

  const BottomLines = () => (
    <div style={{ marginTop: 10, display: 'grid', rowGap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8 }}>
        <div>24hourASP:</div>
        <div style={line} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 200px auto 200px', alignItems: 'end', gap: 8 }}>
        <div>24hour Intake:</div>
        <div style={line} />
        <div>24hour Output Intake:</div>
        <div style={line} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 200px auto 200px', alignItems: 'end', gap: 8 }}>
        <div>24hour Drain1:</div>
        <div style={line} />
        <div>24hour Drain2:</div>
        <div style={line} />
      </div>
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>MONITORING CHART</div>
        <PatientLine />

        {/* Main Grid */}
        <div>
          <GridHeader />
          {timesTop.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
          {timesMid.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
          {timesBottom.map((t) => (
            <GridRow key={t} timeLabel={t} />
          ))}
          <TotalRow />
        </div>

        <BottomLines />

        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>23</div>
      </div>
    </div>
  );
}

// Page 24 - DAILY PROGRESS SHEET
export function DailyProgressSheetPage24() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;

  const HospitalHeader = () => (
    <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 18, letterSpacing: 0.5, marginBottom: 8 }}>
      CHEEMA HEART COMPLEX & GENERAL HOSPITAL
    </div>
  );

  const TopBoxes = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 220px', gap: 8, alignItems: 'stretch', marginBottom: 8 }}>
      <div style={{ border: tableBorder }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>MR Number:</div>
          <div />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Patient Name</div>
          <div />
        </div>
      </div>

      <div />

      <div style={{ border: tableBorder }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Date:</div>
          <div />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr' }}>
          <div style={{ padding: '4px 6px', fontWeight: 700, borderRight: tableBorder }}>Time:</div>
          <div />
        </div>
      </div>
    </div>
  );

  const SectionTitle: React.FC<{ text: string }> = ({ text }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 220px', alignItems: 'end', gap: 8, marginTop: 8 }}>
      <div style={{ fontWeight: 700 }}>{text}</div>
      <div />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 6 }}>
        <div>Sign:</div>
        <div style={line} />
      </div>
    </div>
  );

  const RuledBlock: React.FC<{ rows?: number; tall?: boolean }> = ({ rows = 6, tall }) => (
    <div style={{ marginTop: 4, borderLeft: tableBorder, borderRight: tableBorder, borderTop: tableBorder }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ borderBottom: tableBorder, minHeight: tall ? 32 : 26 }} />
      ))}
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <HospitalHeader />

        <TopBoxes />

        <div style={{ textAlign: 'center', fontWeight: 800, margin: '4px 0 6px' }}>DAILY PROGRESS SHEET</div>

        {/* Morning */}
        <SectionTitle text="Morning Nursing Notes:" />
        <RuledBlock rows={7} tall />

        {/* Evening */}
        <SectionTitle text="Evening Nursing Notes:" />
        <RuledBlock rows={6} tall />

        {/* Night */}
        <SectionTitle text="Night Nursing Notes:" />
        <RuledBlock rows={6} tall />

        {/* Charge Nurse Sign */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 200px', alignItems: 'end', gap: 8, marginTop: 10 }}>
          <div />
          <div style={{ fontWeight: 700 }}>C/N Sign:</div>
          <div style={line} />
        </div>

        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>24</div>
      </div>
    </div>
  );
}

// Page 22 - REGULAR PRESCRIPTION & ADMINISTRATION (Continuation)
export function RegularPrescriptionAdministrationPage22() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 18 } as React.CSSProperties;

  const DrugBlock = () => (
    <div style={{ border: tableBorder }}>
      <div style={{ padding: '4px 6px', fontWeight: 800, borderBottom: tableBorder }}>Drug</div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px 1fr' }}>
        <div style={{ borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Dose</div>
        <div style={{ borderRight: tableBorder }} />
        <div style={{ borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Route</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 1fr', borderTop: tableBorder }}>
        <div style={{ borderRight: tableBorder, padding: '4px 6px' }}>Start Date:</div>
        <div style={{ borderRight: tableBorder }} />
        <div style={{ borderRight: tableBorder, padding: '4px 6px' }}>End Date:</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'end', gap: 8, padding: '4px 6px', borderTop: tableBorder }}>
        <div>Dr. Name</div>
        <div style={line} />
        <div>Dr. Signature</div>
        <div style={line} />
      </div>
    </div>
  );

  const AdminGrid = () => {
    const rows = 30;
    return (
      <div style={{ borderLeft: tableBorder, borderRight: tableBorder, borderTop: tableBorder, height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 80px repeat(10, 1fr)' }}>
          {['Time','Date', ...Array.from({ length: 10 }).map(()=> '')].map((h,i)=>(
            <div key={i} style={{ borderRight: i===11? 'none' : tableBorder, padding: '4px 6px', fontWeight: i<2?700:400 }}>{h}</div>
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r)=>(
          <div key={r} style={{ display: 'grid', gridTemplateColumns: '80px 80px repeat(10, 1fr)', borderTop: tableBorder }}>
            {Array.from({ length: 12 }).map((_, c)=>(
              <div key={c} style={{ borderRight: c===11? 'none' : tableBorder, height: 22, borderBottom: r===rows-1? tableBorder : 'none' }} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={container}>
      <div style={page}>
        <div style={{ fontWeight: 900, textAlign: 'center', marginBottom: 6 }}>REGULAR PRESCRIPTION & ADMINISTRATION</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            {Array.from({ length: 5 }).map((_, i)=>(
              <div key={i} style={{ marginBottom: 10 }}>
                <DrugBlock />
              </div>
            ))}
          </div>
          <div style={{ width: 410 }}>
            <AdminGrid />
          </div>
        </div>
        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>22</div>
      </div>
    </div>
  );
}

// Page 21 - REGULAR PRESCRIPTION & ADMINISTRATION (with signatures/header)
export function RegularPrescriptionAdministrationPage21() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;
  const tableBorder = '1px solid #333';

  const SignatureGrid = () => (
    <div style={{ border: tableBorder }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        {['Name','Signature','Name','Signature'].map((h,i)=>(
          <div key={i} style={{ borderRight: i%4===3? 'none' : tableBorder, padding: '4px 6px', fontWeight: 700 }}>{h}</div>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, r)=>(
        <div key={r} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderTop: tableBorder }}>
          {Array.from({ length: 4 }).map((_, c)=>(
            <div key={c} style={{ borderRight: c===3? 'none' : tableBorder, height: 28 }} />
          ))}
        </div>
      ))}
    </div>
  );

  const PatientRow = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 140px auto 160px auto 1fr', alignItems: 'end', gap: 8, marginTop: 10 }}>
      <div style={{ fontWeight: 700 }}>Name</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>Age/Sex</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>MR#</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>Location</div>
      <div style={line} />
    </div>
  );

  const DrugBlock = () => (
    <div style={{ border: tableBorder }}>
      <div style={{ padding: '4px 6px', fontWeight: 800, borderBottom: tableBorder }}>Drug</div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px 1fr' }}>
        <div style={{ borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Dose</div>
        <div style={{ borderRight: tableBorder }} />
        <div style={{ borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Route</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 1fr', borderTop: tableBorder }}>
        <div style={{ borderRight: tableBorder, padding: '4px 6px' }}>Start Date:</div>
        <div style={{ borderRight: tableBorder }} />
        <div style={{ borderRight: tableBorder, padding: '4px 6px' }}>End Date:</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'end', gap: 8, padding: '4px 6px', borderTop: tableBorder }}>
        <div>Dr. Name</div>
        <div style={{ borderBottom: '1px solid #333', minHeight: 18 }} />
        <div>Dr. Signature</div>
        <div style={{ borderBottom: '1px solid #333', minHeight: 18 }} />
      </div>
    </div>
  );

  const AdminGrid = () => {
    const rows = 30;
    return (
      <div style={{ borderLeft: tableBorder, borderRight: tableBorder, borderTop: tableBorder, height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 80px repeat(10, 1fr)' }}>
          {['Time','Date', ...Array.from({ length: 10 }).map(()=> '')].map((h,i)=>(
            <div key={i} style={{ borderRight: i===11? 'none' : tableBorder, padding: '4px 6px', fontWeight: i<2?700:400 }}>{h}</div>
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r)=>(
          <div key={r} style={{ display: 'grid', gridTemplateColumns: '80px 80px repeat(10, 1fr)', borderTop: tableBorder }}>
            {Array.from({ length: 12 }).map((_, c)=>(
              <div key={c} style={{ borderRight: c===11? 'none' : tableBorder, height: 22, borderBottom: r===rows-1? tableBorder : 'none' }} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={container}>
      <div style={page}>
        <SignatureGrid />
        <PatientRow />
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>REGULAR PRESCRIPTION & ADMINISTRATION</div>
            {Array.from({ length: 5 }).map((_, i)=>(
              <div key={i} style={{ marginBottom: 10 }}>
                <DrugBlock />
              </div>
            ))}
          </div>
          <div style={{ width: 410 }}>
            <AdminGrid />
          </div>
        </div>
        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>21</div>
      </div>
    </div>
  );
}

// Page 20 - REGULAR PRESCRIPTION & ADMINISTRATION (Continuation)
export function RegularPrescriptionAdministrationPage20() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const tableBorder = '1px solid #333';
  const line = { borderBottom: '1px solid #333', minHeight: 18 } as React.CSSProperties;

  // Reuse subcomponents from page 19 by re-defining with same styles
  const DrugBlock = () => (
    <div style={{ border: tableBorder }}>
      <div style={{ padding: '4px 6px', fontWeight: 800, borderBottom: tableBorder }}>Drug</div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px 1fr', alignItems: 'stretch' }}>
        <div style={{ borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Dose</div>
        <div style={{ borderRight: tableBorder }} />
        <div style={{ borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Route</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 1fr', borderTop: tableBorder }}>
        <div style={{ borderRight: tableBorder, padding: '4px 6px' }}>Start Date:</div>
        <div style={{ borderRight: tableBorder }} />
        <div style={{ borderRight: tableBorder, padding: '4px 6px' }}>End Date:</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'end', gap: 8, padding: '4px 6px', borderTop: tableBorder }}>
        <div>Dr. Name</div>
        <div style={line} />
        <div>Dr. Signature</div>
        <div style={line} />
      </div>
    </div>
  );

  const AdminGrid = () => {
    const rows = 30;
    return (
      <div style={{ borderLeft: tableBorder, borderRight: tableBorder, borderTop: tableBorder, height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 80px repeat(10, 1fr)' }}>
          {['Time','Date', ...Array.from({ length: 10 }).map(()=> '')].map((h,i)=>(
            <div key={i} style={{ borderRight: i===11? 'none' : tableBorder, padding: '4px 6px', fontWeight: i<2?700:400 }}>{h}</div>
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r)=>(
          <div key={r} style={{ display: 'grid', gridTemplateColumns: '80px 80px repeat(10, 1fr)', borderTop: tableBorder }}>
            {Array.from({ length: 12 }).map((_, c)=>(
              <div key={c} style={{ borderRight: c===11? 'none' : tableBorder, height: 22, borderBottom: r===rows-1? tableBorder : 'none' }} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={container}>
      <div style={page}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>REGULAR PRESCRIPTION & ADMINISTRATION</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            {Array.from({ length: 5 }).map((_, i)=>(
              <div key={i} style={{ marginBottom: 10 }}>
                <DrugBlock />
              </div>
            ))}
          </div>
          <div style={{ width: 410 }}>
            <AdminGrid />
          </div>
        </div>
        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>20</div>
      </div>
    </div>
  );
}

// Page 19 - REGULAR PRESCRIPTION & ADMINISTRATION
export function RegularPrescriptionAdministrationPage() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;
  const tableBorder = '1px solid #333';

  // Top signatures grid
  const SignatureGrid = () => (
    <div style={{ border: tableBorder }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        {['Name','Signature','Name','Signature'].map((h,i)=>(
          <div key={i} style={{ borderRight: i%4===3? 'none' : tableBorder, padding: '4px 6px', fontWeight: 700 }}>{h}</div>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, r)=>(
        <div key={r} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderTop: tableBorder }}>
          {Array.from({ length: 4 }).map((_, c)=>(
            <div key={c} style={{ borderRight: c===3? 'none' : tableBorder, height: 28 }} />
          ))}
        </div>
      ))}
    </div>
  );

  // Patient line row
  const PatientRow = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 140px auto 160px auto 1fr', alignItems: 'end', gap: 8, marginTop: 10 }}>
      <div style={{ fontWeight: 700 }}>Name</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>Age/Sex</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>MR#</div>
      <div style={line} />
      <div style={{ fontWeight: 700 }}>Location</div>
      <div style={line} />
    </div>
  );

  // Left drug block
  const DrugBlock = () => (
    <div style={{ border: tableBorder }}>
      {/* Drug header */}
      <div style={{ padding: '4px 6px', fontWeight: 800, borderBottom: tableBorder }}>Drug</div>
      {/* Dose/Route/Start/End grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px 1fr', alignItems: 'stretch' }}>
        <div style={{ borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Dose</div>
        <div style={{ borderRight: tableBorder }} />
        <div style={{ borderRight: tableBorder, padding: '4px 6px', fontWeight: 700 }}>Route</div>
        <div />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 1fr', borderTop: tableBorder }}>
        <div style={{ borderRight: tableBorder, padding: '4px 6px' }}>Start Date:</div>
        <div style={{ borderRight: tableBorder }} />
        <div style={{ borderRight: tableBorder, padding: '4px 6px' }}>End Date:</div>
        <div />
      </div>
      {/* Dr name/signature line */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', alignItems: 'end', gap: 8, padding: '4px 6px', borderTop: tableBorder }}>
        <div>Dr. Name</div>
        <div style={{ borderBottom: '1px solid #333', minHeight: 18 }} />
        <div>Dr. Signature</div>
        <div style={{ borderBottom: '1px solid #333', minHeight: 18 }} />
      </div>
    </div>
  );

  // Right administration grid
  const AdminGrid = () => {
    const rows = 30; // extend to bottom
    return (
    <div style={{ borderLeft: tableBorder, borderRight: tableBorder, borderTop: tableBorder, height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 80px repeat(10, 1fr)' }}>
        {['Time','Date', ...Array.from({ length: 10 }).map(()=> '')].map((h,i)=>(
          <div key={i} style={{ borderRight: i===11? 'none' : tableBorder, padding: '4px 6px', fontWeight: i<2?700:400 }}>{h}</div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r)=>(
        <div key={r} style={{ display: 'grid', gridTemplateColumns: '80px 80px repeat(10, 1fr)', borderTop: tableBorder }}>
          {Array.from({ length: 12 }).map((_, c)=>(
            <div key={c} style={{ borderRight: c===11? 'none' : tableBorder, height: 22, borderBottom: r===rows-1? tableBorder : 'none' }} />
          ))}
        </div>
      ))}
    </div>
    );
  };

  return (
    <div style={container}>
      <div style={page}>
        <SignatureGrid />
        <PatientRow />
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>REGULAR PRESCRIPTION & ADMINISTRATION</div>
            {/* Repeat 5 drug blocks */}
            {Array.from({ length: 5 }).map((_, i)=>(
              <div key={i} style={{ marginBottom: 10 }}>
                <DrugBlock />
              </div>
            ))}
          </div>
          <div style={{ width: 410 }}>
            <AdminGrid />
          </div>
        </div>
        <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12 }}>19</div>
      </div>
    </div>
  );
}

// Page 18 - BLOOD SUGAR CHART
export function BloodSugarChartPage() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 20, textAlign: 'center', marginBottom: 8 };
  const line = { borderBottom: '1px solid #333', minHeight: 22 } as React.CSSProperties;
  const tableBorder = '1px solid #333';

  const times = ['6am','10am','12 Noon','2pm','6pm','10pm','Total Insulin'];

  const GridRow: React.FC<{ children?: React.ReactNode; cols?: string }>
    = ({ children, cols = '100px repeat(7, 1fr)' }) => (
    <div style={{ display: 'grid', gridTemplateColumns: cols, borderLeft: tableBorder, borderRight: tableBorder }}>
      {children}
    </div>
  );

  function Cell({ children, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
    return (
      <div style={{ borderBottom: tableBorder, borderTop: tableBorder, borderRight: tableBorder, minHeight: 26, padding: '4px 6px', fontSize: 12, ...(style as React.CSSProperties) }} {...rest}>
        {children}
      </div>
    );
  }

  const DayBlock: React.FC<{ dayLabel: string }>= ({ dayLabel }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ fontWeight: 800 }}>{dayLabel}</div>
        <div style={{ marginLeft: 'auto', display: 'grid', gridTemplateColumns: 'auto 140px', alignItems: 'end', gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Date</div>
          <div style={line} />
        </div>
      </div>

      <div style={{ borderTop: tableBorder, borderLeft: tableBorder, borderRight: tableBorder }}>
        {/* Header row */}
        <GridRow>
          <Cell style={{ fontWeight: 700 }}>Date</Cell>
          {times.map((t, i) => (
            <Cell key={i} style={{ fontWeight: 700 }}>{i === 0 ? 'Time' : t}</Cell>
          ))}
        </GridRow>

        {/* BSR and orders rows (5 visible rows similar to sheet) */}
        {[ 'BSR', 'Insulin Dose Recommend /Doctor', 'Dr. Sign.', 'Dose Given/ Staff Nurse' ].map((lbl, r) => (
          <GridRow key={r}>
            <Cell style={{ fontWeight: 700 }}>{lbl}</Cell>
            {Array.from({ length: 7 }).map((_, c) => (
              <Cell key={c} />
            ))}
          </GridRow>
        ))}
      </div>

      {/* Staff Nurse Sign. line under grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8, marginTop: 6 }}>
        <div style={{ fontWeight: 700 }}>Staff Nurse Sign.</div>
        <div style={line} />
      </div>

      {/* 7am Duty Doctor Comments: line */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8, marginTop: 6 }}>
        <div>7am Duty Doctor Comments:</div>
        <div style={line} />
      </div>

      <div style={{ textAlign: 'right', marginTop: 4 }}>Doctor Signature:</div>
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>BLOOD SUGAR CHART</div>
        <DayBlock dayLabel={'1st Day'} />
        <DayBlock dayLabel={'2nd Day'} />
        <DayBlock dayLabel={'3rd Day'} />
        <DayBlock dayLabel={'4th Day'} />
        <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12 }}>18</div>
      </div>
    </div>
  );
}

// Page 17 - STAT / EMERGENCY TREATMENT
export function StatEmergencyTreatmentPage() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const topRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;
  const tableBorder = '1px solid #333';

  const MRBoxes = () => (
    <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ width: 18, height: 18, border: '1px solid #333' }} />
      ))}
    </div>
  );

  const HeaderInfo = () => (
    <div style={{ display: 'grid', gridTemplateRows: 'auto auto', rowGap: 8 }}>
      <div style={topRow}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
          <div style={{ fontWeight: 700 }}>MR.No.</div>
          <MRBoxes />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
          <div style={{ fontWeight: 700 }}>Date</div>
          <div style={line} />
        </div>
      </div>

      <div style={topRow}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end', gridColumn: '1 / -1' }}>
          <div style={{ fontWeight: 700 }}>Name</div>
          <div style={line} />
        </div>
      </div>

      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto 1fr auto 1fr', gap: 8, alignItems: 'end' }}>
          <div style={{ fontWeight: 700 }}>Age</div>
          <div style={line} />
          <div style={{ fontWeight: 700 }}>M / F</div>
          <div style={{ width: 28, height: 18, borderBottom: '1px solid #333' }} />
          <div style={{ fontWeight: 700 }}>Ward</div>
          <div style={line} />
          <div style={{ fontWeight: 700 }}>Consultant</div>
          <div style={line} />
        </div>
      </div>
    </div>
  );

  const GridRow: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px 100px 90px 120px 110px 110px', borderLeft: tableBorder, borderRight: tableBorder }}>
      {children}
    </div>
  );

  function Cell({ children, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
    return (
      <div style={{ borderBottom: tableBorder, borderTop: tableBorder, borderRight: tableBorder, minHeight: 28, padding: '4px 6px', fontSize: 12, ...(style as React.CSSProperties) }} {...rest}>
        {children}
      </div>
    );
  }

  const headers = ['Date', 'Drug', 'Dose', 'Route', 'Time', 'Doctor Sign.', 'Time Given', 'Given By'];

  return (
    <div style={container}>
      <div style={page}>
        <HeaderInfo />
        <div style={{ fontWeight: 900, fontSize: 18, textAlign: 'center', margin: '6px 0 8px' }}>STAT / EMERGENCY TREATMENT</div>

        <div style={{ borderTop: tableBorder, borderLeft: tableBorder, borderRight: tableBorder, marginBottom: 10 }}>
          <GridRow>
            {headers.map((h, i) => (
              <Cell key={i} style={{ fontWeight: 700 }}>{h}</Cell>
            ))}
          </GridRow>
          {Array.from({ length: 15 }).map((_, r) => (
            <GridRow key={r}>
              {headers.map((_, c) => (
                <Cell key={c} />
              ))}
            </GridRow>
          ))}
        </div>

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>17</div>
      </div>
    </div>
  );
}

// Page 15 - FOR DOCTOR'S NOTES ONLY (duplicate layout)
export function DoctorsNotesPage15() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 18, textAlign: 'center', marginBottom: 8 };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;

  const TopInfo = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Date</div>
        <div style={line} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Patient's Progress Notes</div>
        <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ width: 18, height: 18, border: '1px solid #333' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Name</div>
        <div style={line} />
        <div style={{ fontWeight: 700 }}>Regd. No.</div>
        <div style={line} />
      </div>
    </div>
  );

  const RuledArea = () => (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(20, 1fr)', rowGap: 12 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ borderBottom: '1px solid #333', height: 18 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 0, borderLeft: '1px solid #333' }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>FOR DOCTOR'S NOTES ONLY</div>
        <TopInfo />
        <RuledArea />
        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>15</div>
      </div>
    </div>
  );
}

// Page 16 - FOR DOCTOR'S NOTES ONLY (duplicate layout)
export function DoctorsNotesPage16() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 18, textAlign: 'center', marginBottom: 8 };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;

  const TopInfo = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Date</div>
        <div style={line} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Patient's Progress Notes</div>
        <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ width: 18, height: 18, border: '1px solid #333' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Name</div>
        <div style={line} />
        <div style={{ fontWeight: 700 }}>Regd. No.</div>
        <div style={line} />
      </div>
    </div>
  );

  const RuledArea = () => (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(20, 1fr)', rowGap: 12 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ borderBottom: '1px solid #333', height: 18 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 0, borderLeft: '1px solid #333' }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>FOR DOCTOR'S NOTES ONLY</div>
        <TopInfo />
        <RuledArea />
        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>16</div>
      </div>
    </div>
  );
}

// Page 14 - FOR DOCTOR'S NOTES ONLY
export function DoctorsNotesPage() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 18, textAlign: 'center', marginBottom: 8 };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;

  const TopInfo = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Date</div>
        <div style={line} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Patient's Progress Notes</div>
        <div style={{ display: 'grid', gridAutoFlow: 'column', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ width: 18, height: 18, border: '1px solid #333' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Name</div>
        <div style={line} />
        <div style={{ fontWeight: 700 }}>Regd. No.</div>
        <div style={line} />
      </div>
    </div>
  );

  const RuledArea = () => (
    <div style={{ position: 'relative', marginTop: 8 }}>
      {/* horizontal ruled lines */}
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(20, 1fr)', rowGap: 12 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ borderBottom: '1px solid #333', height: 18 }} />
        ))}
      </div>
      {/* vertical center line */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 0, borderLeft: '1px solid #333' }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>FOR DOCTOR'S NOTES ONLY</div>
        <TopInfo />
        <RuledArea />

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>14</div>
      </div>
    </div>
  );
}

// Page 12 - CONSULTANT/MO/WMO - NOTES (Pt. Receiving)
export function ConsultantNotesPage() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const hospitalTitle: React.CSSProperties = { fontWeight: 900, fontSize: 18, textAlign: 'center', marginBottom: 6 };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;

  const TopRow = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6, alignItems: 'end' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>MR Number:</div>
        <div style={line} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Date:</div>
        <div style={line} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Patient Name:</div>
        <div style={line} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
        <div style={{ fontWeight: 700 }}>Time:</div>
        <div style={line} />
      </div>
    </div>
  );

  const TitleBar = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', border: '2px solid #333', borderLeft: 0, borderRight: 0, padding: '6px 8px', margin: '4px 0 6px', fontWeight: 800 }}>
      <div style={{ textAlign: 'center' }}>CONSULTANT/MO/WMO - NOTES</div>
      <div>(Pt. Receiving)</div>
    </div>
  );

  const RuledLines: React.FC<{ count: number }> = ({ count }) => (
    <div style={{ display: 'grid', gridTemplateRows: `repeat(${count}, 1fr)`, rowGap: 10, marginTop: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderBottom: '1px solid #333', height: 20 }} />
      ))}
    </div>
  );

  const FooterBoxes = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginTop: 16, alignItems: 'end' }}>
      {['Doctor Name:', 'Sign:', 'Date:', 'Time:'].map((label, i) => (
        <div key={i} style={{ border: '1px solid #333', height: 40, display: 'flex', alignItems: 'flex-end', padding: '0 8px' }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={hospitalTitle}>CHEEMA HEART COMPLEX & GENERAL HOSPITAL</div>
        <TopRow />
        <TitleBar />
        {/* Many ruled lines area for notes */}
        <RuledLines count={18} />

        <FooterBoxes />

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>12</div>
      </div>
    </div>
  );
}

// Page 11 - OPERATIVE NOTES
export function OperativeNotesPage() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const title: React.CSSProperties = { fontWeight: 900, fontSize: 18, textAlign: 'center', marginBottom: 10 };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;

  const LabelLine: React.FC<{ label: string; grow?: boolean }> = ({ label, grow }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 8, flex: grow ? 1 : undefined }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
      <div style={line} />
    </div>
  );

  const MiniBox: React.FC<{ width?: number }> = ({ width = 80 }) => (
    <div style={{ border: '1px solid #333', height: 24, width }} />
  );

  const NumberedLine: React.FC<{ n: number }> = ({ n }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'end', margin: '6px 0' }}>
      <div style={{ fontWeight: 700 }}>{n}.</div>
      <div style={line} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>OPERATIVE NOTES</div>

        {/* Operation & Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Operation" />
          <LabelLine label="Date" />
        </div>

        {/* Surgeon */}
        <div style={{ marginBottom: 6 }}>
          <LabelLine label="Surgeon" />
        </div>

        {/* Assistants */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Asst. 1" />
          <LabelLine label="2." />
        </div>

        {/* Anesthetic and Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Anesthetic" />
          <LabelLine label="Type of Anesthesia" />
        </div>

        {/* Incision and Staff Nurse */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Incision" />
          <LabelLine label="Staff Nurse" />
        </div>

        {/* Procedure Name */}
        <div style={{ marginBottom: 6 }}>
          <LabelLine label="Procedure Name" />
        </div>

        {/* Findings numbered */}
        <div style={{ fontWeight: 800, marginTop: 6 }}>Finding :</div>
        <NumberedLine n={1} />
        <NumberedLine n={2} />
        <NumberedLine n={3} />
        <NumberedLine n={4} />
        <NumberedLine n={5} />

        {/* Blood Loss / Transfused / Pint */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 12, alignItems: 'center', marginTop: 6 }}>
          <LabelLine label="Blood Loss" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Transfused By:</div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" /> Yes</label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" /> No</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Pint:</div>
            <MiniBox width={70} />
          </div>
        </div>

        {/* Drain / Specimen / Histopathology */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Drain</div>
            <MiniBox />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Specimen (If Removed)</div>
            <MiniBox />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Histopathology</div>
            <MiniBox />
          </div>
        </div>

        {/* Patient's condition */}
        <div style={{ marginTop: 8 }}>
          <LabelLine label={"Patient's Condition end of surgery"} />
        </div>

        {/* Post Operation Order lines */}
        <div style={{ marginTop: 10, fontWeight: 800 }}>Post Operation Order</div>
        <div style={{ ...line, marginTop: 6 }} />
        <div style={{ ...line, marginTop: 6 }} />
        <div style={{ ...line, marginTop: 6 }} />
        <div style={{ ...line, marginTop: 6 }} />
        <div style={{ ...line, marginTop: 6 }} />

        {/* Footer signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'end', marginTop: 12 }}>
          <LabelLine label="Dr. Name & Sign." />
          <LabelLine label="Date & Time" />
        </div>

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>11</div>
      </div>
    </div>
  );
}

// Page 10 - SURGICAL SAFETY CHECKLIST
export function SurgicalSafetyChecklistPage() {
  const container: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 16, background: '#f7f7f7' };
  const page: React.CSSProperties = { background: '#fff', width: '100%', maxWidth: 900, border: '2px solid #222', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 18, color: '#111' };
  const headerTitle: React.CSSProperties = { fontWeight: 900, fontSize: 18, textAlign: 'center', letterSpacing: .5, marginBottom: 8 };
  const bigTitle: React.CSSProperties = { fontWeight: 900, fontSize: 18, textAlign: 'center', margin: '6px 0 8px' };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;
  const small = { fontSize: 13 } as React.CSSProperties;

  const LabelLine: React.FC<{ label: string; grow?: boolean }> = ({ label, grow }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 6, flex: grow ? 1 : undefined }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={line} />
    </div>
  );

  const BlockTitle: React.FC<{ title: string }> = ({ title }) => (
    <div style={{ background: '#333', color: '#fff', padding: '6px 8px', fontWeight: 800, margin: '10px 0 6px' }}>{title}</div>
  );

  const CheckRow: React.FC<{ text: string; boxes?: ('Yes'|'No'|'NA')[] }> = ({ text, boxes }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', ...small }}>
      <input type="checkbox" /> <span>{text}</span>
      {boxes?.map((b, i) => (
        <label key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <input type="checkbox" /> {b}
        </label>
      ))}
    </div>
  );

  const tableBorder = '1px solid #333';
  type DivProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };
  function Cell({ children, style, ...rest }: DivProps) {
    return (
      <div style={{ borderBottom: tableBorder, borderRight: tableBorder, padding: '6px 8px', fontSize: 12, ...(style as React.CSSProperties) }} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={page}>
        <div style={headerTitle}>CHEEMA HEART COMPLEX & GENERAL HOSPITAL</div>

        {/* MR/Date/Patient/Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
            <div style={{ fontWeight: 700 }}>MR Number:</div>
            <div style={line} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
            <div style={{ fontWeight: 700 }}>Date:</div>
            <div style={line} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
            <div style={{ fontWeight: 700 }}>Patient name</div>
            <div style={line} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'end' }}>
            <div style={{ fontWeight: 700 }}>Time:</div>
            <div style={line} />
          </div>
        </div>

        <div style={bigTitle}>SURGICAL SAFETY CHECKLIST</div>
        <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 8 }}>
          Before induction of anaesthesia  ————  Before skin incision  ————  Before patient leaves operating room
        </div>

        {/* SIGN IN */}
        <BlockTitle title="SIGN IN" />
        <CheckRow text="PATIENT HAS CONFIRMED" />
        <div style={{ marginLeft: 22 }}>
          <CheckRow text="IDENTITY" />
          <CheckRow text="SITE" />
          <CheckRow text="PROCEDURE" />
          <CheckRow text="CONSENT" />
        </div>
        <CheckRow text="SITE MARKED/NOT APPLICABLE" />
        <CheckRow text="ANAESTHESIA SAFETY CHECK COMPLETED" boxes={["Yes"]} />
        <CheckRow text="PULSE OXIMETER ON PATIENT AND FUNCTIONING" />
        <CheckRow text="DOES PATIENT HAVE A:" />
        <div style={{ marginLeft: 22 }}>
          <CheckRow text="KNOWN ALLERGY?" boxes={["Yes","No"]} />
          <CheckRow text="DIFFICULT AIRWAY/ASPIRATION RISK?" boxes={["Yes","No"]} />
          <CheckRow text="RISK OF &gt;500ML BLOOD LOSS (7ML/KG IN CHILDREN)?" boxes={["Yes","No"]} />
          <CheckRow text="AND ADEQUATE INTRAVENOUS ACCESS AND FLUIDS PLANNED" />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginTop: 8 }}>
          <LabelLine label="All documents Like, X-Ray, Medical, Diagnostic Reports" grow />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Yes</span><input type='checkbox' />
            <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 8 }}>No</span><input type='checkbox' />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 12, alignItems: 'end', marginTop: 8 }}>
          <LabelLine label="Anaesthetic Name" />
          <LabelLine label="Sign" />
          <LabelLine label="Date/Time" />
        </div>

        {/* TIME OUT and SIGN OUT side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <BlockTitle title="TIME OUT" />
            <CheckRow text="CONFIRM ALL TEAM MEMBERS HAVE INTRODUCED THEMSELVES BY NAME AND ROLE" />
            <CheckRow text="SURGEON, ANAESTHESIA PROFESSIONAL AND NURSE VERBALLY CONFIRM PATIENT / SITE / PROCEDURE" />
            <CheckRow text="ANTICIPATED CRITICAL EVENTS" />
            <CheckRow text="SURGON REVIEWS: WHAT ARE THE CRITICAL OR UNEXPECTED STEPS, OPERATIVE DURATION, ANTICIPATED BLOOD LOSS?" />
            <CheckRow text="ANAESTHESIA TEAM REVIEWS: ANY PATIENT-SPECIFIC CONCERNS?" />
            <CheckRow text="NURSING TEAM REVIEWS: HAS STERILITY (INCLUDING INDICATOR RESULTS) BEEN CONFIRMED? ARE THERE EQUIPMENT ISSUES OR ANY CONCERNS?" />
            <CheckRow text="HAS ANTIBIOTIC PROPHYLAXIS BEEN GIVEN WITHIN THE LAST 60 MINUTES?" boxes={["Yes","No","NA"]} />
            <CheckRow text="IS ESSENTIAL IMAGING DISPLAYED?" boxes={["Yes","No","NA"]} />
          </div>
          <div>
            <BlockTitle title="SIGN OUT" />
            <CheckRow text="NURSE VERBALLY CONFIRMS WITH THE TEAM:" />
            <div style={{ marginLeft: 22 }}>
              <CheckRow text="THE NAME OF THE PROCEDURE RECORDED" />
              <CheckRow text="THAT INSTRUMENT, SPONGE AND NEEDLE COUNTS ARE CORRECT (OR NOT APPLICABLE)" />
              <CheckRow text="HOW THE SPECIMEN IS LABELLED (INCLUDING PATIENT NAME)" />
              <CheckRow text="WHETHER THERE ARE ANY EQUIPMENT PROBLEMS TO BE ADDRESSED" />
            </div>
            <CheckRow text="SURGEON, ANAESTHESIA PROFESSIONAL AND NURSE REVIEW THE KEY CONCERNS FOR RECOVERY AND MANAGEMENT OF THIS PATIENT" />
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop: 6 }}>
              <span style={{ fontSize: 13 }}>SPONGES AND INSTRUMENT REMOVED & COUNTED:</span>
              <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}><input type='checkbox'/> Yes</label>
              <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}><input type='checkbox'/> No</label>
            </div>
          </div>
        </div>

        {/* Modified Aldrete Scoring System */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Modified Aldrete Scoring System:</div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 5fr 1fr', borderTop: tableBorder, borderLeft: tableBorder }}>
            <Cell style={{ fontWeight: 700 }}>Category</Cell>
            <Cell style={{ fontWeight: 700 }}>Description of Status</Cell>
            <Cell style={{ fontWeight: 700 }}>Aldrete Score</Cell>
            <Cell>Respirations</Cell>
            <Cell>Breathe, Coughs / freely Dyspnea / Apnea</Cell>
            <Cell>2 / 1 / 0</Cell>
            <Cell>O2 Saturation</Cell>
            <Cell>O2 Saturation 92% on Room Air / Supplemental Oxygen</Cell>
            <Cell>2 / 1</Cell>
            <Cell>Circulation</Cell>
            <Cell>BP +/- 20 mmHg pre-op / BP -20-50 mmHg pre-op / BP &gt;50 mmHg pre-op</Cell>
            <Cell>2 / 1 / 0</Cell>
            <Cell>LOC</Cell>
            <Cell>Awake & Oriented / Wakens with Stimulation / Not Responding</Cell>
            <Cell>2 / 1 / 0</Cell>
            <Cell>Movement</Cell>
            <Cell>Moves 4 limbs on command / Own Moves 2 limbs / Own Moves 0 limbs</Cell>
            <Cell>2 / 1 / 0</Cell>
          </div>
          <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12 }}>Modified Aldrete Scoring: __ 10</div>
        </div>

        {/* Footer Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, alignItems: 'end', marginTop: 12 }}>
          <LabelLine label="Surgeon Name:" />
          <LabelLine label="Sign:" />
          <LabelLine label="Date:" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, alignItems:'end', marginTop:6 }}>
          <LabelLine label="Time:" />
          <div />
        </div>

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>10</div>
      </div>
    </div>
  );
}

// Page 9 - PRE-OPERATIVE ORDERS
export function PreOperativeOrdersPage() {
  const container: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    padding: 16,
    background: '#f7f7f7',
  };

  const page: React.CSSProperties = {
    background: '#fff',
    width: '100%',
    maxWidth: 900,
    border: '2px solid #222',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    padding: 18,
    color: '#111',
  };

  const title: React.CSSProperties = { fontWeight: 800, fontSize: 16, textAlign: 'center', marginBottom: 10 };
  const gridTop: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 10 };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;

  const LabelLine: React.FC<{ label: string; placeholder?: string; grow?: boolean }>
    = ({ label, placeholder, grow }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 6, flex: grow ? 1 : undefined }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={line}>
        <input placeholder={placeholder} style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0' }} />
      </div>
    </div>
  );

  const BulletLine: React.FC<{ label?: string }>= ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
      <div style={{ fontWeight: 700 }}>•</div>
      {label ? <div style={{ fontWeight: 700 }}>{label}</div> : null}
      <div style={{ ...line, flex: 1 }} />
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        <div style={title}>PRE-OPERATIVE ORDERS</div>

        {/* Top identity row */}
        <div style={gridTop}>
          <LabelLine label="Patient name" />
          <LabelLine label="MR Number" />
          <LabelLine label="Date" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Time" />
          <div />
        </div>

        {/* Checks */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', margin: '8px 0' }}>
          <div><input type="checkbox" /> <span style={{ fontWeight: 700 }}>Maintain I/V line with</span></div>
          <div style={{ flex: 1, ...line }} />
          <div><input type="checkbox" /> <span style={{ fontWeight: 700 }}>Shave and prepare the patient</span></div>
        </div>

        {/* NPO */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>• N P O Date/Time</div>
            <div style={{ ...line, flex: 1 }} />
          </div>
          <BulletLine />
          <BulletLine />
        </div>

        {/* Mark the Site */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Mark the Site:</div>
          <BulletLine />
          <BulletLine />
          <BulletLine />
        </div>

        {/* Medications */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Medications:</div>
          <BulletLine />
          <BulletLine />
          <BulletLine />
          <BulletLine />
        </div>

        {/* Any Special Instructions */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Any Special Instructions:</div>
          <BulletLine />
          <BulletLine />
          <BulletLine />
        </div>

        {/* Plan */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Plan:</div>
          <BulletLine />
          <BulletLine />
          <BulletLine />
        </div>

        {/* Footer */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'end', marginTop: 12 }}>
          <LabelLine label="Dr. Name & Signature" />
          <LabelLine label="Date & Time" />
        </div>

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>9</div>
      </div>
    </div>
  );
}

// Page 8 - Recovery Notes / Recovery Room Record / Post Anesthesia Notes
export function RecoveryNotesPage() {
  const container: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    padding: 16,
    background: '#f7f7f7',
  };

  const page: React.CSSProperties = {
    background: '#fff',
    width: '100%',
    maxWidth: 900,
    border: '2px solid #222',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    padding: 18,
    color: '#111',
  };

  const sectionTitle: React.CSSProperties = { fontWeight: 800, margin: '8px 0 6px' };
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;

  const LabelLine: React.FC<{ label: string; placeholder?: string; grow?: boolean }>
    = ({ label, placeholder, grow }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 6, flex: grow ? 1 : undefined }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={line}>
        <input placeholder={placeholder} style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0' }} />
      </div>
    </div>
  );

  const tableBorder = '1px solid #333';

  const GridRow: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr 1fr 2fr 1.5fr', borderLeft: tableBorder, borderRight: tableBorder }}>
      {children}
    </div>
  );

  const Cell: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, style, ...rest }) => (
    <div style={{ borderBottom: tableBorder, borderTop: tableBorder, borderRight: tableBorder, minHeight: 26, padding: '4px 6px', fontSize: 12, ...style }} {...rest}>
      {children}
    </div>
  );

  const headerLabels = ['Time', 'Pulse', 'BP', 'R/R', 'SPO2', 'Drugs', 'IV fluid / Blood'];

  return (
    <div style={container}>
      <div style={page}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>RECOVERY Notes:-</div>

        <div style={sectionTitle}>IMMEDIATE POST ANESTHESIA STATUS <span style={{ fontWeight: 400 }}>No apparent Anesthesia Complication ______</span></div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Level of Consciousness" />
          <LabelLine label="BP" />
          <LabelLine label="Pulse" />
          <LabelLine label="SPO2" />
          <LabelLine label="RR" />
          <LabelLine label="Pain" />
          <LabelLine label="Vomiting" />
        </div>

        <div style={{ margin: '6px 0' }}>
          <div style={{ marginBottom: 8 }}>Patient has recovered from immediate effects of Anesthesia & may be transferred to recovery room</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
            <LabelLine label="Dr." />
            <LabelLine label="Time" />
            <LabelLine label="Date" />
          </div>
        </div>

        <div style={sectionTitle}>RECOVERY ROOM RECORD:</div>
        <div style={{ borderTop: tableBorder, borderLeft: tableBorder, borderRight: tableBorder, marginBottom: 10 }}>
          <GridRow>
            {headerLabels.map((h, i) => (
              <Cell key={i} style={{ fontWeight: 700 }}>{h}</Cell>
            ))}
          </GridRow>
          {Array.from({ length: 14 }).map((_, r) => (
            <GridRow key={r}>
              {headerLabels.map((_, c) => (
                <Cell key={c} />
              ))}
            </GridRow>
          ))}
        </div>

        <div style={sectionTitle}>POST ANESTHESIA NOTES AT SHIFTING FROM RECOVERY ROOM</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Conscious level" />
          <LabelLine label="BP" />
          <LabelLine label="Pulse" />
          <LabelLine label="SPO" />
          <LabelLine label="RR" />
          <LabelLine label="Pain" />
          <LabelLine label="Vomiting" />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Shivering" />
          <LabelLine label="Surgical Site Bleeding" />
          <LabelLine label="Swelling" />
          <LabelLine label="Hematoma" />
          <LabelLine label="Aldrete Score" />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 8 }}>
          <LabelLine label="Patients may be transferred to ward / ICU (Shifting Person)" grow />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 10 }}>
          <LabelLine label="Dr." />
          <LabelLine label="Sign." />
          <LabelLine label="Date/Time" />
        </div>

        <div style={sectionTitle}>RECEIVING NOTES IN ICU/WARD/ROOM</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="Patient Received from Recovery Room at" />
          <LabelLine label="am/pm with following vitals:" grow />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 6 }}>
          <LabelLine label="BP" />
          <LabelLine label="Pulse" />
          <LabelLine label="SPO" />
          <LabelLine label="RR" />
          <LabelLine label="Pain" />
          <LabelLine label="Vomiting" />
          <LabelLine label="Aldrete Score" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, alignItems: 'end', marginBottom: 10 }}>
          <LabelLine label="Receiving Person Name" />
          <LabelLine label="Sign." />
          <LabelLine label="Date/Time" />
        </div>

        <div style={sectionTitle}>ADVERSE ANESTHESIA EVENTS: <span style={{ fontWeight: 400 }}>Adverse Anesthesia event</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'end', marginBottom: 10 }}>
          <LabelLine label="Details" />
          <LabelLine label="Management" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
          <LabelLine label="Condition of the patient at the end" />
          <LabelLine label="Dr." />
          <LabelLine label="Sign." />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginTop: 8 }}>
          <LabelLine label="Date/Time" />
        </div>

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>8</div>
      </div>
    </div>
  );
}

// Pre Anaesthesia Assessment (English)
export function PreAnesthesiaAssessmentForm() {
  const container: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    padding: 16,
    background: '#f7f7f7',
  };

  const page: React.CSSProperties = {
    background: '#fff',
    width: '100%',
    maxWidth: 900,
    border: '2px solid #222',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    padding: 18,
    color: '#111',
  };

  const title: React.CSSProperties = { fontWeight: 800, fontSize: 16 };
  const line: React.CSSProperties = { borderBottom: '1px solid #333', minHeight: 26 };
  const row: React.CSSProperties = { display: 'grid', gap: 10, alignItems: 'end', marginBottom: 8 };
  const labelS: React.CSSProperties = { fontSize: 13, fontWeight: 700 };

  const LabelLine: React.FC<{ label: string; placeholder?: string }> = ({ label, placeholder }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 6 }}>
      <div style={labelS}>{label}</div>
      <div style={line}>
        <input placeholder={placeholder} style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0' }} />
      </div>
    </div>
  );

  const ThinDivider: React.FC = () => <div style={{ borderTop: '1px solid #333', margin: '8px 0' }} />;

  return (
    <div style={container}>
      <div style={page}>
        {/* Header section */}
        <div style={{ ...row, gridTemplateColumns: '1.2fr 1fr 1fr' }}>
          <div style={title}>PRE ANAESTHESIA ASSESSMENT:</div>
          <LabelLine label="Date/Time" />
          <LabelLine label="Medical Record No." />
        </div>

        <div style={{ ...row, gridTemplateColumns: '1.2fr 1fr 1fr 1fr' }}>
          <LabelLine label="Dr." />
          <LabelLine label="Patient's Name" />
          <LabelLine label="Age/Sex" />
          <LabelLine label="S/o, D/o, W/o" />
        </div>

        {/* Medical History */}
        <div style={{ ...title, marginTop: 6 }}>MEDICAL HISTORY:</div>
        <div style={{ ...row, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <LabelLine label="Allergies" />
          <LabelLine label="Drug used" />
          <LabelLine label="Family History" />
        </div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <LabelLine label="Menstrual History" />
          <LabelLine label="Tobacco/ Other addiction" />
          <LabelLine label="APD" />
          <LabelLine label="Physical Activity" />
          <LabelLine label="CVS" />
          <LabelLine label="Renal" />
        </div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <LabelLine label="Respiration" />
          <LabelLine label="Hepatic" />
          <LabelLine label="Diabetics" />
          <LabelLine label="Neurology" />
          <LabelLine label="Previous Anesthesia History" />
        </div>
        <div style={{ ...row, gridTemplateColumns: '1fr 1fr' }}>
          <LabelLine label="Diagnosis" />
          <LabelLine label="Proposed Operation" />
        </div>
        <LabelLine label="Presenting Complains" />

        {/* Physical Examination */}
        <div style={{ ...title, marginTop: 6 }}>PHYSICAL EXAMINATION:-</div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <LabelLine label="Patient's orientation" />
          <LabelLine label="BP" />
          <LabelLine label="Pulse" />
          <LabelLine label="RR" />
          <LabelLine label="Temp" />
          <LabelLine label="Wt" />
        </div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <LabelLine label="Heart" />
          <LabelLine label="Lungs" />
          <LabelLine label="Extremities" />
        </div>
        <LabelLine label="Examination of back" />

        {/* Examination of Air Way */}
        <div style={{ ...title, marginTop: 6 }}>EXAMINATION OF AIR WAY:</div>
        <div style={{ fontSize: 13, margin: '6px 0 8px' }}>
          Teeth <span style={{ border: '1px solid transparent' }} /> Mouth Opening (fingers): 1 / 2 / 3 &nbsp;&nbsp; Mandibular Protrusion: A/B/C
        </div>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          Mallampati Class:- 1/2/3/4 &nbsp;&nbsp; Thyro-mental distance &gt;3 fingers / &lt; 3 fingers &nbsp;&nbsp; Atlanto-occipital Ext:&lt;90 &gt;90
        </div>
        <LabelLine label="Other" />

        <LabelLine label="Lab investigation" />
        <div style={{ ...row, gridTemplateColumns: '1fr 1fr' }}>
          <LabelLine label="Opinion required" />
          <LabelLine label="ASA Class" />
        </div>

        <div style={{ ...title, marginTop: 6 }}>Anaesthetic Plan:-</div>
        <div style={{ fontSize: 13, margin: '4px 0 8px' }}>
          General / Regional / Spinal / Local / Anaesthesia Monitored Care
        </div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <LabelLine label="NPO" />
          <LabelLine label="Pre Anaesthesia Medication" />
          <LabelLine label="Fluid Blood" />
        </div>
        <LabelLine label="Any Special Instruction" />

        <div style={{ ...row, gridTemplateColumns: '2fr 1fr 1fr' }}>
          <LabelLine label="Dr. Name / Stamp" />
          <LabelLine label="Sign" />
          <LabelLine label="Date / Time" />
        </div>

        <ThinDivider />

        {/* PER-OPERATED ANAESTHESIA RECORD */}
        <div style={{ ...row, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div style={title}>PER-OPERATED ANAESTHESIA RECORD</div>
          <LabelLine label="Dr." />
          <LabelLine label="Assistant" />
        </div>
        <div style={{ ...row, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <LabelLine label="Date/Time" />
          <LabelLine label="Patient's Name" />
          <LabelLine label="Age/Sex" />
        </div>
        <div style={{ ...row, gridTemplateColumns: '1fr 1fr' }}>
          <LabelLine label="S/o, D/o, W/o" />
          <LabelLine label="Diagnosis" />
        </div>
        <LabelLine label="Operation" />

        <div style={{ fontSize: 13, margin: '6px 0 8px' }}>
          CHECK LIST: Patient identified □ Consent □ Chart Revised □ Site/Procedure Checked □ Anaesthesia Machine/Monitor & Medicine Checked □
        </div>

        <div style={{ ...row, gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <LabelLine label="PRE INDUCTION RE-EVALUATION" />
          <LabelLine label="Patient's Orientation" />
          <LabelLine label="BP" />
          <LabelLine label="Pulse" />
          <LabelLine label="SPO2" />
          <LabelLine label="Allergies" />
        </div>
        <div style={{ ...row, gridTemplateColumns: '1fr 1fr' }}>
          <LabelLine label="ASA" />
          <LabelLine label="IV / SITE" />
        </div>
        <LabelLine label="Posture during surgery" />

        <div style={{ ...title, marginTop: 6 }}>ANAESTHESIA PLAN:-</div>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          1. General   2. Regional/Spinal   3. Local
        </div>

        <div style={{ ...title }}>INDUCTION:-</div>
        <div style={{ fontSize: 13, margin: '4px 0 8px' }}>
          Pre-Oxygenation   L.Blade _____   ETT _____   Cuff/ Non Cuff / Oral / Nasal / LMA / Mask
        </div>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          Airway Security and Patency: Yes □ No □   ETT Placement Confirm / Traumatic / Atraumatic / Eyes protection
        </div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <LabelLine label="Anesthesia start" />
          <LabelLine label="Anesthesia End" />
        </div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <LabelLine label="Surgery Start" />
          <LabelLine label="Surgery / Dr." />
        </div>

        <div style={{ ...title, marginTop: 6 }}>DRUGS</div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <LabelLine label="Pre induction" />
          <LabelLine label="Induction" />
          <LabelLine label="Relaxant" />
        </div>
        <div style={{ ...row, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <LabelLine label="Oxygen flow / Ratio" />
          <LabelLine label="N2O flow / Ratio" />
          <LabelLine label="FORANE / SEVORANE" />
          <LabelLine label="Analgesia" />
        </div>

        <div style={{ ...row, gridTemplateColumns: '2fr 1fr 1fr' }}>
          <LabelLine label="Dr. Name / Stamp" />
          <LabelLine label="Sign" />
          <LabelLine label="Date / Time" />
        </div>

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>6</div>
      </div>
    </div>
  );
}

// Page 7 - Other Drugs / Ventilation / Spinal Anesthesia record
export function OtherDrugsPage() {
  const container: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    padding: 16,
    background: '#f7f7f7',
  };

  const page: React.CSSProperties = {
    background: '#fff',
    width: '100%',
    maxWidth: 900,
    border: '2px solid #222',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    padding: 18,
    color: '#111',
  };

  const section = { fontWeight: 800, margin: '6px 0 6px' } as React.CSSProperties;
  const small = { fontSize: 13 } as React.CSSProperties;
  const line = { borderBottom: '1px solid #333', minHeight: 24 } as React.CSSProperties;
  const row = { display: 'grid', gap: 10, alignItems: 'end', marginBottom: 8 } as React.CSSProperties;

  const LabelLine: React.FC<{ label: string; placeholder?: string; grow?: boolean }>
    = ({ label, placeholder, grow }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'end', gap: 6, flex: grow ? 1 : undefined }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={line}>
        <input placeholder={placeholder} style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0' }} />
      </div>
    </div>
  );

  // Build grid header and empty rows similar to the photo
  const tableBorder = '1px solid #333';

  const GridRow: React.FC<{ cells: number } & React.HTMLAttributes<HTMLDivElement>> = ({ cells, style, ...rest }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 1fr 1fr 1fr 2fr 1.5fr',
        borderLeft: tableBorder,
        borderRight: tableBorder,
        ...style,
      }}
      {...rest}
    />
  );

  const Cell: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, style, ...rest }) => (
    <div style={{ borderBottom: tableBorder, borderTop: tableBorder, borderRight: tableBorder, minHeight: 26, padding: '4px 6px', fontSize: 12, ...style }} {...rest}>
      {children}
    </div>
  );

  const headerLabels = ['Time', 'Pulse', 'BP', 'R/R', 'SPO2', 'Drugs', 'IV fluid / Blood'];

  return (
    <div style={container}>
      <div style={page}>
        <div style={{ ...section, fontSize: 14 }}>OTHER DRUGS</div>

        <div style={{ ...small, marginBottom: 8 }}>
          <div style={{ marginBottom: 4 }}>VENTILATION MODE:- 1. Spontaneously &nbsp;&nbsp; 2. Controlled &nbsp;&nbsp; 3. Assisted</div>
          <div style={{ marginBottom: 4 }}>CIRCUIT: &nbsp; 1. Magill &nbsp; 2. Brain &nbsp; 3. Ayre's T. Piece &nbsp; 4. Circle System &nbsp; 5. Throat Pack &nbsp; 6. Tourniquet Time</div>
          <div style={{ marginBottom: 6 }}>SPINAL ANESTHESIA:- Pre Load ______ &nbsp;&nbsp; Spinal Needle ______ &nbsp;&nbsp; Spinal Space ______ &nbsp;&nbsp; Injection Traumatic / A Traumatic</div>
          <div style={{ marginBottom: 6, display:'flex', gap:10, alignItems:'end' }}>
            <LabelLine label="Position of Patient during injection:" grow />
            <div style={{ fontSize: 13 }}>1. Sitting &nbsp;&nbsp; 2. Lying</div>
          </div>
          <div style={{ ...row, gridTemplateColumns: '1fr 1fr' as any }}>
            <LabelLine label="Position of Patient after injection:" />
            <LabelLine label="Level of Anesthesia" />
          </div>
        </div>

        {/* Table */}
        <div style={{ borderTop: tableBorder, borderLeft: tableBorder, borderRight: tableBorder }}>
          <GridRow cells={7}>
            {headerLabels.map((h, i) => (
              <Cell key={i} style={{ fontWeight: 700 }}>{h}</Cell>
            ))}
          </GridRow>
          {Array.from({ length: 18 }).map((_, r) => (
            <GridRow key={r} cells={7}>
              {headerLabels.map((_, c) => (
                <Cell key={c} />
              ))}
            </GridRow>
          ))}
        </div>

        {/* Bottom other drugs and totals */}
        <div style={{ ...section, marginTop: 10, fontSize: 14 }}>OTHER DRUGS</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 10 }}>
          <LabelLine label="Total- Fluid intake Blood:" grow />
          <LabelLine label="Blood Loss" />
          <LabelLine label="Urine out Put" />
          <LabelLine label="Other" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, alignItems:'end' }}>
          <LabelLine label="Dr. Name / Stamp" />
          <LabelLine label="Sign" />
          <LabelLine label="Date / Time" />
        </div>

        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 12 }}>7</div>
      </div>
    </div>
  );
}

// Urdu Consent Form (اجازت نامہ) - RTL layout matching provided photo
export function UrduConsentForm() {
  const container: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    padding: 16,
    background: "#f7f7f7",
  };

  const page: React.CSSProperties = {
    background: "#fff",
    width: "100%",
    maxWidth: 860,
    border: "2px solid #222",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    padding: 18,
    direction: "rtl",
    fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Noto Sans Arabic', system-ui, sans-serif",
  };

  const topRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1fr",
    gap: 12,
    marginBottom: 12,
    alignItems: "end",
  };

  const line: React.CSSProperties = {
    borderBottom: "1px solid #333",
    paddingBottom: 6,
  };

  const smallRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    margin: "8px 0 14px",
  };

  const badge: React.CSSProperties = {
    border: "2px solid #222",
    borderRadius: 12,
    padding: "10px 14px",
    width: 160,
    textAlign: "center",
    fontWeight: 800,
    marginInlineStart: "auto",
  };

  const para: React.CSSProperties = { lineHeight: 1.9, fontSize: 16, margin: "8px 0" };

  const sigRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: 12,
    marginTop: 16,
    alignItems: "end",
  };

  const sectionTitleUrdu: React.CSSProperties = {
    fontWeight: 800,
    fontSize: 18,
    margin: "12px 0 8px",
  };

  const ThinDivider = () => <div style={{ borderTop: "1px solid #333", margin: "12px 0" }} />;

  const LabelLine: React.FC<{ label: string; placeholder?: string }> = ({ label, placeholder }) => (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "center", gap: 8 }}>
      <div style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{label}</div>
      <div style={line}>
        <input
          placeholder={placeholder}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 16, background: "transparent" }}
        />
      </div>
    </div>
  );

  const FourBullets: React.FC = () => (
    <ol style={{ margin: "4px 0 8px 18px" }}>
      <li style={para}>میں تصدیق کرتی/کرتا ہوں کہ ____________ نے مجھے بے ہوشی کے عمل کے بارے میں تفصیلاً بتادیا ہے۔</li>
      <li style={para}>میں ڈاکٹر ____________ کی مکمل نگرانی میں رہوں گا/گی۔</li>
      <li style={para}>میں نے بے ہوشی کے عمل کے متعلق پوچھے گئے سوالات کے جوابات تسلی بخش طور پر سمجھ لیے ہیں۔</li>
      <li style={para}>مجھے معلوم ہے کہ بے ہوشی کے عمل کے دوران کچھ ممکنہ پیچیدگیاں واقع ہو سکتی ہیں۔</li>
    </ol>
  );

  const TwoBullets: React.FC = () => (
    <ol style={{ margin: "4px 0 8px 18px" }}>
      <li style={para}>__________</li>
      <li style={para}>__________</li>
    </ol>
  );

  return (
    <div style={container}>
      <div style={page}>
        {/* Top Line: Patient/MR/Procedure */}
        <div style={topRow}>
          <LabelLine label="مریض کا نام:" />
          <LabelLine label="ایم آر #:" />
          <LabelLine label="طریقہ کار (Procedure):" />
        </div>

        <div style={smallRow}>
          <LabelLine label="تشخیص (Diagnosis):" />
          <LabelLine label="طریقہ کار (Procedure):" />
        </div>

        {/* Anesthesia consent header badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <FourBullets />
          </div>
          <div style={badge}>بے ہوشی کا اجازت نامہ</div>
        </div>

        <div style={sectionTitleUrdu}>بے ہوشی سے متعلق پیچیدگیاں</div>
        <TwoBullets />

        <div style={para}>میں مکمل طور پر ان پیچیدگیوں کے ممکنہ خطرات کو سمجھتا/سمجھتی ہوں اور اپنے فہم و مفاد میں بے ہوشی کے عمل کی اجازت دیتا/دیتی ہوں۔</div>

        {/* Signatures row 1 */}
        <div style={sigRow}>
          <LabelLine label="ڈاکٹر کا نام:" />
          <LabelLine label="دستخط:" />
          <LabelLine label="تاریخ:" />
          <LabelLine label="وقت:" />
        </div>

        <ThinDivider />

        {/* Second part: Surgical consent */}
        <div style={smallRow}>
          <LabelLine label="تشخیص (Diagnosis):" />
          <LabelLine label="طریقہ کار (Procedure):" />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={para}>میں تصدیق کرتی/کرتا ہوں کہ ____________ نے مجھے سرجری کے طریقۂ کار کے بارے میں اور اس کے نتائج و ممکنہ خطرات کے بارے میں تفصیلاً آگاہ کیا ہے۔</p>
            <p style={para}>مجھے معلوم ہے کہ سرجری کے دوران پیچیدگیاں جیسے خون کا ضیاع، انفیکشن، بے ہوشی کے اثرات اور دیگر پیچیدگیاں پیش آ سکتی ہیں اور ان کے سدباب کے لیے اضافی طریقۂ کار کی ضرورت بھی پیش آ سکتی ہے۔</p>
            <p style={para}>میں اپنی مرضی اور سمجھ بوجھ کے تحت اس سرجری کی اجازت دیتا/دیتی ہوں۔</p>
          </div>
          <div style={{ ...badge, width: 150 }}>سرجری کی اجازت نامہ</div>
        </div>

        <div style={sectionTitleUrdu}>خصوصی سرجری عمل سے متعلق ممکنہ پیچیدگیاں</div>
        <TwoBullets />

        {/* Signatures row 2 */}
        <div style={sigRow}>
          <LabelLine label="ولی/ضامن کا نام:" />
          <LabelLine label="دستخط:" />
          <LabelLine label="تاریخ:" />
          <LabelLine label="وقت:" />
        </div>

        <div style={{ textAlign: "left", direction: "ltr", marginTop: 10, fontSize: 12 }}>4</div>
      </div>
    </div>
  );
}

export { HospitalForm };

// Blood/Blood Components Transfusion Consent (Urdu)
export function UrduTransfusionConsentForm() {
  const container: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    padding: 16,
    background: "#f7f7f7",
  };

  const page: React.CSSProperties = {
    background: "#fff",
    width: "100%",
    maxWidth: 860,
    border: "2px solid #222",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    padding: 18,
    direction: "rtl",
    fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Noto Sans Arabic', system-ui, sans-serif",
  };

  const header: React.CSSProperties = { textAlign: "center", marginBottom: 10, lineHeight: 1.8 };
  const pill: React.CSSProperties = { display:'inline-block', border: '1px solid #222', borderRadius: 14, padding: '4px 12px', fontWeight: 700 };
  const line: React.CSSProperties = { borderBottom: '1px solid #333', paddingBottom: 6 };
  const para: React.CSSProperties = { lineHeight: 1.9, fontSize: 16, margin: '8px 0' };
  const smallRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '8px 0 12px' };

  const LabelLine: React.FC<{ label: string; placeholder?: string; cols?: number }> = ({ label, placeholder, cols }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, gridColumn: cols ? `span ${cols}` : undefined }}>
      <div style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{label}</div>
      <div style={line}>
        <input placeholder={placeholder} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 16, background: 'transparent' }} />
      </div>
    </div>
  );

  const SigRow: React.FC<{ labels: string[] }> = ({ labels }) => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop: 10 }}>
      {labels.map((l, i) => (
        <LabelLine key={i} label={l} />
      ))}
    </div>
  );

  return (
    <div style={container}>
      <div style={page}>
        {/* Title */}
        <div style={header}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>انتقال خون و خون کے اجزاء کا اجازت نامہ</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>اور رسید برائے وصولی مالی معلومات</div>
          <div style={{ marginTop: 8 }}><span style={pill}>مریض کی شناخت</span></div>
        </div>

        {/* Identity lines */}
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr', gap:12, marginBottom:12 }}>
          <LabelLine label="نام:" />
          <LabelLine label="والد/والدہ:" />
          <LabelLine label="عمر:" />
          <LabelLine label="جنس:" />
        </div>

        <div style={smallRow}>
          <LabelLine label="ایم آر نمبر:" cols={1} />
          <LabelLine label="وارڈ/بستر:" cols={1} />
          <LabelLine label="معالج:" cols={2} />
        </div>

        {/* Body paragraphs (summary) */}
        <p style={para}>میں خون/خون کے اجزاء لگوانے کی اجازت دیتا/دیتی ہوں۔ مجھے بتایا گیا ہے کہ خون یا اس کے اجزاء لگانے سے متعلق ممکنہ فوائد اور خطرات موجود ہیں جن میں انفیکشن، الرجک/ری ایکشن، بخار، اور نایاب امراض جیسے HIV/ہیپاٹائٹس/سیفلس وغیرہ کی منتقلی کا خطرہ شامل ہے۔ ڈاکٹر نے مجھے اس عمل کے فوائد، متبادل اور تحفظات بتا دیے ہیں اور میں نے سوالات کے تسلی بخش جوابات حاصل کر لیے ہیں۔</p>

        <p style={para}>اس ہسپتال کی بلڈ بینک ٹیم قومی ہدایات کے مطابق اسکریننگ کرتی ہے تاہم صفر خطرہ ممکن نہیں۔ میں اس امر کی اجازت دیتا/دیتی ہوں کہ ضرورت کے مطابق خون/خون کے اجزاء کی فراہمی کی جائے۔</p>

        <p style={para}>میں تصدیق کرتا/کرتی ہوں کہ مجھے نام پڑھ کر سنایا گیا/یا میں نے پڑھ کر دیکھا ہے اور مجھے سمجھایا گیا ہے۔ یہ میری طرف سے رضامندی پر مبنی اجازت نامہ ہے۔</p>

        {/* Signatures and times */}
        <LabelLine label="بلڈ بینکر/نرس:" />
        <SigRow labels={["مریض/نگہبان کے دستخط:", "وقت اور تاریخ:"]} />
        <SigRow labels={["گواہ:", "وقت اور تاریخ:"]} />
        <SigRow labels={["دستخطِ اسٹاف:", "وقت اور تاریخ:"]} />
        <SigRow labels={["دستخطِ ڈاکٹر/نرس:", "وقت اور تاریخ:"]} />

        <div style={{ textAlign: 'left', direction: 'ltr', marginTop: 10, fontSize: 12 }}>5</div>
      </div>
    </div>
  );
}