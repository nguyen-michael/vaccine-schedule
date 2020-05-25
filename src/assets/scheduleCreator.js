/* 
- Vaccine object
    - Vaccine Name
    - Vaccine Variant
    - Array of Dates
    example:
    {
        name: "PCV13",
        variants: null,
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: "notes specific to entire vaccine."
    }
- Date of Birth

Returns:
    Array of Dose objects, to be assigned as vaccines[index].schedule array
    example:
    {
        date: date,
        latestRecommendedDate: null,
        earliestPossibleDate: null,
        received: true,
        ageReceived: null, // in months?
        intervalSinceLastDose: null,
        minInterval: null,
        late: false,
        early: false,
        required: true,
        notes: "notes specific to this dose."
    }

Ages will be in objects of months, weeks, days, representation.
Lets keep them as Duration objects until we're ready to package it up.
*/

const luxon = require('luxon');
const dt = luxon.DateTime;
const dur = luxon.Duration;
const now = dt.local();

/* Main Scheduler/Sorter */
function parseSchedule(vaccine, dateOfBirthISOString) {
    const dateOfBirth = dt.fromISO(dateOfBirthISOString);
    const datesReceived = vaccine.datesReceived;
    const age = now.diff(dateOfBirth, ['months', 'weeks', 'days']);

    // Create the received doses schedule array.
    vaccine.schedule = datesReceived.map((date, index, arr) => {
        let ageReceived = dt.fromISO(date).diff(dateOfBirth, ['months', 'weeks', 'days']);
        return {
            date: date,
            latestRecommendedDate: null,
            earliestPossibleDate: null,
            received: true,
            ageReceived: ageReceived,
            intervalSinceLastDose: index === 0 ? ageReceived : dt.fromISO(date).diff(dt.fromISO(arr[index - 1]), ['months', 'weeks', 'days']),
            minInterval: null,
            late: false,
            early: false,
            required: true,
            notes: ""
        }
    });

    // Sort and process based on the vaccine.
    switch (vaccine.name) {
        case "HiB":
            vaccine = hibScheduler(vaccine, age, dateOfBirth);
            break;
        case "HepA":
            vaccine = hepAScheduler(vaccine, age, dateOfBirth);
            break;
        case "HepB":
            vaccine = hepBScheduler(vaccine, age, dateOfBirth);
            break;
        case "IPV":
            vaccine = ipvScheduler(vaccine, age, dateOfBirth);
            break;
        case "Rotavirus":
            vaccine = rotavirusScheduler(vaccine, age, dateOfBirth);
            break;
        case "DTAP":
            vaccine = dtapScheduler(vaccine, age, dateOfBirth);
            break;
        case "Varicella":
            vaccine = varicellaScheduler(vaccine, age, dateOfBirth);
            break;
        case "MMR":
            vaccine = mmrScheduler(vaccine, age, dateOfBirth);
            break;
        case "PCV13":
            vaccine = pcv13Scheduler(vaccine, age, dateOfBirth);
            break;

    }

    // Check Earliness
    // if interval since last < min interval
    // or date received before earliest possible date
    vaccine.schedule.forEach((dose) => {
        if (
            dose.received
            && dose.required
            && (
                dose.intervalSinceLastDose.valueOf() < dose.minInterval.valueOf()
                || dt.fromISO(dose.date) < dose.earliestPossibleDate
            )
        ) {
            dose.notes = dose.notes.length === 0 ? "This dose is early." : dose.notes.concat(" This dose is early.");
            dose.early = true;
        }
    });

    // Check lateness (if received and past latest rec or current date past rec)
    vaccine.schedule.forEach((dose) => {
        if (
            dose.required
            &&
            (dose.received && dt.fromISO(dose.date) > dose.latestRecommendedDate) || (!dose.received && dt.local() > dose.latestRecommendedDate)
        ) {
            dose.notes = dose.notes.length === 0 ? "This dose is late." : dose.notes.concat(" This dose is late.");
            dose.late = true;
        }
    });

    // For late doses, assume that they'll be given today, calculate subsequent dose dates.
    // If first dose or current dose is not received and is late, set latestrecdate to today and recalc min intervals for subsequent doses
    vaccine.schedule.forEach((dose, index, arr) => {
        if (!dose.received && dose.late && (index === 0 || arr[index - 1].received)) {
            dose.latestRecommendedDate = dt.local();
            dose.notes = dose.notes.length === 0 ? "This dose is late, recommend adminstering today." : dose.notes.concat(" This dose is late, recommend adminstering today.");

            // Adjust subsequent doses
            for (var i = index + 1; i < arr.length; i++) {
                vaccine.schedule[i].earliestPossibleDate = vaccine.schedule[i - 1].latestRecommendedDate.plus(vaccine.schedule[i].minInterval);
                vaccine.schedule[i].notes = vaccine.schedule[i].notes.length === 0 ? "This dose succeeds a late dose; earliest possible date adjusted." : vaccine.schedule[i].notes.concat(" This dose succeeds a late dose; earliest possible date adjusted.");
            }
        }
    });

    // Convert to ISO string before sending back out or object if it's easier (the durations)

    console.log(JSON.stringify(vaccine, null, 4));
    return vaccine;
}


/* Vaccine Specific Schedulers */
/* These return the entire updated vaccine object */
function hibScheduler(vaccine, age, dateOfBirth) {
    console.log(JSON.stringify(vaccine, null, 4));
}

function hepAScheduler(vaccine, age, dateOfBirth) {
    console.log(JSON.stringify(vaccine, null, 4));
}

function hepBScheduler(vaccine, age, dateOfBirth) {
    console.log(JSON.stringify(vaccine, null, 4));
}

function ipvScheduler(vaccine, age, dateOfBirth) {
    console.log(JSON.stringify(vaccine, null, 4));
}

function rotavirusScheduler(vaccine, age, dateOfBirth) {
    console.log(JSON.stringify(vaccine, null, 4));
}

function dtapScheduler(vaccine, age, dateOfBirth) {
    console.log(JSON.stringify(vaccine, null, 4));
}

function varicellaScheduler(vaccine, age, dateOfBirth) {
    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = [dateOfBirth.plus({ months: 15 }), dateOfBirth.plus({ months: 60 })];

    // Fill in gaps with empty doses
    while (vaccine.schedule.length < 2) {
        const dose = {
            date: null,
            latestRecommendedDate: null,
            earliestPossibleDate: null,
            received: false,
            ageReceived: null,
            intervalSinceLastDose: null,
            minInterval: null,
            late: false,
            early: false,
            required: true,
            notes: ""
        };

        vaccine.schedule = [...vaccine.schedule, dose];
    }

    // Check for excess doses
    if (vaccine.schedule.length > 2) {
        vaccine.notes = "Too many doses (2 dose series for Varicella)";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 12 });
    vaccine.schedule[1].minInterval = dur.fromObject({ months: 3 });

    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule[0].earliestPossibleDate = dateOfBirth.plus(vaccine.schedule[0].minInterval);
    vaccine.schedule[1].earliestPossibleDate = vaccine.schedule[0].received
        ? dt.fromISO(vaccine.schedule[0].date).plus(vaccine.schedule[1].minInterval)
        : vaccine.schedule[0].latestRecommendedDate.plus(vaccine.schedule[1].minInterval);


    // Varicella Specific Checks
    if (vaccine.schedule[1].received
        && vaccine.schedule[1].intervalSinceLastDose.valueOf() < dur.fromObject({ weeks: 4 }).valueOf()
    ) {
        vaccine.schedule[1].early = true;
        vaccine.schedule[1].notes = "Dose 2 given too close to Dose 1.";
    } else if (vaccine.schedule[1].received
        && vaccine.schedule[1].intervalSinceLastDose.valueOf() >= dur.fromObject({ weeks: 4 }).valueOf()
        && vaccine.schedule[1].intervalSinceLastDose.valueOf() < dur.fromObject({ months: 3 }).valueOf()
    ) {
        vaccine.schedule[1].early = true;
        vaccine.schedule[1].notes = "Dose 2 may be counted even if early.";
    }

    return vaccine;
}

function mmrScheduler(vaccine, age, dateOfBirth) {
    console.log(JSON.stringify(vaccine, null, 4));
}

function pcv13Scheduler(vaccine, age, dateOfBirth) {
    console.log(JSON.stringify(vaccine, null, 4));
}

/* Test runs */
const testSchedule = parseSchedule({
    name: "Varicella",
    variants: null,
    variant: null,
    datesReceived: [],
    schedule: [],
    notes: ""
}, "2010-12-11");

console.log(testSchedule);