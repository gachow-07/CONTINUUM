// Simple schematic illustrations for the demo project. Every image carries a visible "SAMPLE" label —
// they are placeholders, NOT real CAD, FEA output, or measurements.
const frame = (inner: string, caption: string, bg = "#0f1a2e") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" font-family="ui-sans-serif,system-ui,sans-serif">
<rect width="640" height="400" fill="${bg}"/>
<defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#ffffff" stroke-opacity=".06"/></pattern></defs>
<rect width="640" height="400" fill="url(#g)"/>
${inner}
<text x="20" y="30" fill="#8fb0ff" font-size="12" font-weight="600" letter-spacing="1.2">SAMPLE ILLUSTRATION · NOT REAL CAD OR TEST DATA</text>
<text x="20" y="380" fill="#c7d2e8" font-size="14">${caption}</text></svg>`;

const wheel = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="46" fill="#16233d" stroke="#5b7bbf" stroke-width="2"/><circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#5b7bbf" stroke-width="2"/>`;

export const suspensionRevA = () => frame(`
${wheel(320, 220)}
<rect x="200" y="110" width="100" height="26" rx="4" fill="#223356" stroke="#5b7bbf"/><text x="212" y="127" fill="#c7d2e8" font-size="11">chassis</text>
<line x1="300" y1="123" x2="290" y2="190" stroke="#2563ff" stroke-width="5" stroke-linecap="round"/>
<line x1="300" y1="140" x2="285" y2="200" stroke="#9fb3d9" stroke-width="3" stroke-dasharray="6 5"/>
<line x1="250" y1="136" x2="296" y2="196" stroke="#f0b429" stroke-width="5" stroke-linecap="round"/>
<text x="360" y="150" fill="#8fb0ff" font-size="12">single upper arm</text><text x="360" y="170" fill="#f0b429" font-size="12">coil-over (inboard)</text>
<text x="360" y="190" fill="#9fb3d9" font-size="12">fixed lower link</text>`, "Suspension — Rev A (single upper arm, fixed lower link)");

export const suspensionRevB = () => frame(`
${wheel(330, 235)}
<rect x="190" y="100" width="100" height="34" rx="4" fill="#223356" stroke="#5b7bbf"/><text x="204" y="121" fill="#c7d2e8" font-size="11">chassis</text>
<line x1="290" y1="110" x2="316" y2="204" stroke="#2563ff" stroke-width="5" stroke-linecap="round"/>
<line x1="290" y1="128" x2="322" y2="250" stroke="#2563ff" stroke-width="5" stroke-linecap="round"/>
<line x1="240" y1="134" x2="298" y2="196" stroke="#f0b429" stroke-width="5" stroke-linecap="round"/>
<text x="380" y="140" fill="#8fb0ff" font-size="12">upper wishbone (shorter)</text><text x="380" y="160" fill="#8fb0ff" font-size="12">lower wishbone (longer)</text>
<text x="380" y="180" fill="#f0b429" font-size="12">coil-over (firmer front spring)</text>`, "Suspension — Rev B (unequal-length double wishbone)");

export const chassisPlate = () => frame(`
<rect x="120" y="110" width="400" height="190" rx="14" fill="#16233d" stroke="#5b7bbf" stroke-width="2"/>
<circle cx="170" cy="150" r="9" fill="#0f1a2e" stroke="#5b7bbf"/><circle cx="470" cy="150" r="9" fill="#0f1a2e" stroke="#5b7bbf"/>
<circle cx="170" cy="260" r="9" fill="#0f1a2e" stroke="#5b7bbf"/><circle cx="470" cy="260" r="9" fill="#0f1a2e" stroke="#5b7bbf"/>
<rect x="250" y="170" width="140" height="70" rx="8" fill="none" stroke="#9fb3d9" stroke-dasharray="6 5"/>
<text x="270" y="210" fill="#9fb3d9" font-size="12">battery tray cutout</text>`, "Chassis plate layout (placeholder for the FEA results image)");

export const coverImage = () => frame(`
${wheel(190, 262)}${wheel(450, 262)}
<path d="M120 230 L190 190 L260 170 L400 170 L470 196 L520 232 L520 246 L120 246 Z" fill="#16233d" stroke="#5b7bbf" stroke-width="2"/>
<path d="M270 172 L300 140 L380 140 L404 172" fill="none" stroke="#2563ff" stroke-width="3"/>
<line x1="100" y1="308" x2="540" y2="308" stroke="#5b7bbf" stroke-dasharray="3 6"/>`, "RC Car Design — 1/10 scale off-road buggy (demo project)");

export const calcNote = `SAMPLE DATA — written for the Project Memory demo. Not a real engineering calculation.

Roll-stiffness comparison worksheet (illustrative structure only)
------------------------------------------------------------------
Purpose: compare the qualitative effect of changing front spring rate and roll-center height between Rev A and Rev B.
Inputs recorded by the team: spring rates (as purchased), arm geometry from CAD, and track-test observations.
Not recorded: wheel loads, measured roll angles, or any instrumented data.

Conclusion documented by the team: Rev B is expected to reduce body roll because the roll center sits lower relative to the CG
and the unequal-length arms add camber gain in roll. This is a design expectation drawn from the cited research; it has not been
verified by measurement. A quantitative test (IMU / data logging) is listed as an open next step.
`;
