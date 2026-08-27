import assert from "node:assert/strict";
import { parsePassportMrz } from "../src/lib/mrz";

const firstLine = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<";
const secondLine = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";

const parsed = parsePassportMrz(`${firstLine}\n${secondLine}`);
assert.equal(parsed?.passportNumber, "L898902C3");
assert.equal(parsed?.fullName, "ANNA MARIA ERIKSSON");
assert.equal(parsed?.birthDate, "1974-08-12");
assert.equal(parsed?.passportExpiry, "2012-04-15");
assert.equal(parsed?.gender, "Perempuan");
assert.equal(parsePassportMrz(firstLine + secondLine)?.passportNumber, "L898902C3");

const repaired = parsePassportMrz(`${firstLine}\n${secondLine.replace("02C3", "O2C3")}`);
assert.equal(repaired?.passportNumber, "L898902C3");
assert.deepEqual(repaired?.correctedFields, ["passportNumber"]);

assert.equal(parsePassportMrz(`${firstLine}\n${secondLine.slice(0, -1)}9`), null);

console.log("passport MRZ parser: 4 checks passed");