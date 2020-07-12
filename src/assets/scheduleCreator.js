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
        if (
            !dose.received
            && dose.late
            && (index === 0 || arr[index - 1].received)
            && dose.required
        ) {
            dose.latestRecommendedDate = dt.local();
            dose.notes = dose.notes.length === 0 ? "This dose is late, recommend adminstering today." : dose.notes.concat(" This dose is late, recommend adminstering today.");

            // Adjust subsequent doses
            for (var i = index + 1; i < arr.length; i++) {
                if (vaccine.schedule[i].required) {
                    vaccine.schedule[i].earliestPossibleDate = vaccine.schedule[i - 1].latestRecommendedDate.plus(vaccine.schedule[i].minInterval);
                    // Modify Latest date to match as well
                    vaccine.schedule[i].latestRecommendedDate = vaccine.schedule[i].earliestPossibleDate;
                    vaccine.schedule[i].notes = vaccine.schedule[i].notes.length === 0 ? "This dose succeeds a late dose; earliest possible date adjusted." : vaccine.schedule[i].notes.concat(" This dose succeeds a late dose; earliest possible date adjusted.");
                }
            }
        }
    });

    // Convert to ISO string before sending back out or object if it's easier (the durations)
    vaccine.schedule.forEach(dose => {
        if (dose.latestRecommendedDate) {
            dose.latestRecommendedDate = dose.latestRecommendedDate.toISODate();
        }

        if (dose.earliestPossibleDate) {
            dose.earliestPossibleDate = dose.earliestPossibleDate.toISODate();
        }

        if (dose.received) {
            dose.intervalSinceLastDose = dose.intervalSinceLastDose.toObject();
            dose.ageReceived = dose.ageReceived.toObject();
        }

        if (dose.minInterval) {
            dose.minInterval = dose.minInterval.toObject();
        }

    });

    // console.log(JSON.stringify(vaccine, null, 4));
    return vaccine;
}

/* Vaccine Specific Schedulers */
/* These return the entire updated vaccine object */
function hibScheduler(vaccine, age, dateOfBirth) {
    // Get prp-omp or prp-t (both/unknown will lump with prp -t)
    const isPRPOMP = vaccine.variant === "PRP-OMP (Pedvax)" ? true : false;


    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = isPRPOMP
        ? [dateOfBirth.plus({ months: 2 }), dateOfBirth.plus({ months: 4 }), dateOfBirth.plus({ months: 15 })]
        : [dateOfBirth.plus({ months: 2 }), dateOfBirth.plus({ months: 4 }), dateOfBirth.plus({ months: 6 }), dateOfBirth.plus({ months: 15 })];

    // Fill in gaps with empty doses
    // 4 for prpomp for 3 doses check
    while ((vaccine.schedule.length < 4 && isPRPOMP) || (vaccine.schedule.length < 4 && !isPRPOMP)) {
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
    if (vaccine.schedule.length > 3 && isPRPOMP) {
        vaccine.notes = "Too many doses (3 dose series for HiB with PRP-OMP (PedVax)).";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    } else if (vaccine.schedule.length > 4 && !isPRPOMP) {
        vaccine.notes = "Too many doses (4 dose series for HiB with PRP-T (ActHIB, Hiberex, Pentacel) or Unknown/Mixed).";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 1, weeks: 2 });

    // HiB Specific Min interval Checks
    if (!vaccine.schedule[0].received
        || vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ years: 1 })) {
        vaccine.schedule[1].minInterval = dur.fromObject({ months: 1 });
    } else if (
        vaccine.schedule[0].ageReceived.valueOf() >= dur.fromObject({ years: 1 })
        && vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ years: 1, months: 3 })
    ) {
        vaccine.schedule[1].minInterval = dur.fromObject({ months: 2 });
        // No dose after 2 is necessary
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.required = false;
                dose.notes = "This dose is not required, Dose 1 received between 12 and 15 months of age. Only a second dose is required.";
            }
        });
        vaccine.notes = "Only two doses will be required.";
    } else {
        // Fall back min interval based on CDC
        vaccine.schedule[1].minInterval = dur.fromObject({ months: 2 });
    }

    if (
        age.valueOf() < dur.fromObject({ months: 12 })
        && vaccine.schedule[0].received
        && vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ months: 7 })
        && !isPRPOMP
    ) {
        vaccine.schedule[2].minInterval = dur.fromObject({ months: 1 });
    } else if (
        vaccine.schedule[0].received
        && vaccine.schedule[1].received
        && (
            (
                age.valueOf() < dur.fromObject({ months: 12 })
                && (
                    vaccine.schedule[0].ageReceived.valueOf() >= dur.fromObject({ months: 7 })
                    && vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ months: 12 })
                )
            )
            ||
            (
                age.valueOf() >= dur.fromObject({ months: 12 })
                && age.valueOf() < dur.fromObject({ months: 60 })
                && vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ months: 12 })
                && vaccine.schedule[1].ageReceived.valueOf() < dur.fromObject({ months: 15 })
            )
            ||
            (
                isPRPOMP
                && vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ months: 12 })
                && vaccine.schedule[1].ageReceived.valueOf() < dur.fromObject({ months: 12 })
            )
        )
    ) {
        vaccine.schedule[2].minInterval = dur.fromObject({ months: 2 });
        // No dose after 3 is neccesary
        vaccine.schedule.forEach((dose, index) => {
            if (index > 2) {
                dose.required = false;
                dose.notes = "This dose is not required, HiB dose 2 to dose 3 guidelines.";
            }
        });
    } else {
        // Fallback interval based on cdc 
        vaccine.schedule[2].minInterval = dur.fromObject({ months: 2 });
    }

    if (
        vaccine.schedule[0].received
        && vaccine.schedule[1].received
        && vaccine.schedule[2].received
        && age.valueOf() >= dur.fromObject({ months: 12 })
        && age.valueOf() < dur.fromObject({ months: 60 })
        && vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ months: 12 })
        && vaccine.schedule[1].ageReceived.valueOf() < dur.fromObject({ months: 12 })
        && vaccine.schedule[2].ageReceived.valueOf() < dur.fromObject({ months: 12 })
    ) {
        vaccine.schedule[3].minInterval = dur.fromObject({ months: 2 });
        vaccine.schedule[3].notes = "Dose 4 should be given if child received 3 doses before their first birthday.";
    } else {
        // Fallback interval based on cdc
        vaccine.schedule[3].minInterval = dur.fromObject({ months: 2 });
    }

    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });


    // HiB Specific Checks
    if (
        vaccine.schedule[1].received
        && (vaccine.schedule[0].ageReceived.valueOf() >= dur.fromObject({ months: 15 }) || vaccine.schedule[1].ageReceived.valueOf() >= dur.fromObject({ months: 15 }))
    ) {
        vaccine.schedule.forEach(dose => {
            if (!dose.received) {
                dose.required = false;
                dose.notes = "No further vaccination is required. Patient received dose 1 or 2 at or later than 15 months.";
            }
        });
    }

    if (age.valueOf() >= dur.fromObject({ months: 60 }) && !vaccine.schedule[0].received) {
        vaccine.notes = "Too late for series, do not start. No further vaccination is required.";
        vaccine.schedule.forEach(dose => {
            dose.required = false;
            dose.notes = "No vaccination required, too late to start series."
        });
    }

    return vaccine;
}

function hepAScheduler(vaccine, age, dateOfBirth) {
    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = [dateOfBirth.plus({ months: 12 }), dateOfBirth.plus({ months: 18 })];

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
        vaccine.notes = "Too many doses (2 dose series for Hepatitis A)";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 12 });
    vaccine.schedule[1].minInterval = dur.fromObject({ months: 6 });

    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });

    return vaccine;
}

function hepBScheduler(vaccine, age, dateOfBirth) {
    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = [dateOfBirth, dateOfBirth.plus({ months: 2 }), dateOfBirth.plus({ months: 18 })];

    // Fill in gaps with empty doses
    while (vaccine.schedule.length < 3) {
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
    if (vaccine.schedule.length > 3) {
        vaccine.notes = "Too many doses (3 dose series for Hepatitis B)";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required. 4 Doses are permissible in mixed vaccines.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 0 });
    vaccine.schedule[1].minInterval = dur.fromObject({ months: 1 });
    vaccine.schedule[2].minInterval = dur.fromObject({ months: 2 });

    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });


    // Hepatitis B Specific Checks
    if (
        (vaccine.schedule[2].received
            && (vaccine.schedule[2].ageReceived.valueOf() < dur.fromObject({ weeks: 24 }).valueOf()))
    ) {
        vaccine.schedule[2].early = true;
        vaccine.schedule[2].notes = "Dose 3 too early (should not be administered before 24 weeks of age).";
        vaccine.notes = "Dose 3 is too early."
    } else if (
        vaccine.schedule[2].received
        && (dt.fromISO(vaccine.schedule[2].date).diff(dt.fromISO(vaccine.schedule[0].date)).valueOf() < dur.fromObject({ weeks: 16 }).valueOf())
    ) {
        vaccine.schedule[2].early = true;
        vaccine.schedule[2].notes = "Dose 3 too close to Dose 1 (needs at least 16 week interval).";
        vaccine.notes = "Dose 3 is too close to Dose 1."
    }

    return vaccine;
}

function ipvScheduler(vaccine, age, dateOfBirth) {
    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = [
        dateOfBirth.plus({ months: 2 }),
        dateOfBirth.plus({ months: 4 }),
        dateOfBirth.plus({ months: 18 }),
        dateOfBirth.plus({ months: 72 })
    ];

    // Fill in gaps with empty doses
    while (vaccine.schedule.length < 4) {
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
    if (vaccine.schedule.length > 4) {
        vaccine.notes = "Too many doses (4 dose series for IPV)";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 1, weeks: 2 });
    vaccine.schedule[1].minInterval = dur.fromObject({ months: 1 });
    vaccine.schedule[2].minInterval = (age.valueOf() < dur.fromObject({ years: 4 }))
        ? dur.fromObject({ months: 1 })
        : dur.fromObject({ months: 6 });
    vaccine.schedule[3].minInterval = dur.fromObject({ months: 6 });


    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });


    // IPV Specific Checks
    if (
        vaccine.schedule[3].received
        && vaccine.schedule[3].ageReceived.valueOf() < dur.fromObject({ years: 4 })
    ) {
        vaccine.schedule[3].early = true;
        vaccine.schedule[3].notes = "Dose 4 too early, should not be administered before 4 years of age.";
    }

    if (
        age.valueOf() >= dur.fromObject({ years: 4 })
        && !vaccine.schedule[2].received
    ) {
        vaccine.schedule[2].notes = "Dose 3 will be the final dose needed, since patient is over 4 years of age.";
        vaccine.schedule[3].required = false;
        vaccine.schedule[3].notes = "Dose 4 is not required since patient will receive dose 3 after 4 years of age.";
    }

    return vaccine;
}

function rotavirusScheduler(vaccine, age, dateOfBirth) {
    // Get rotarix or rotateq (both/unknown will lump with rotateq)
    const isRotarix = vaccine.variant === "Rotarix" ? true : false;


    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = isRotarix
        ? [dateOfBirth.plus({ months: 2 }), dateOfBirth.plus({ months: 4 })]
        : [dateOfBirth.plus({ months: 2 }), dateOfBirth.plus({ months: 4 }), dateOfBirth.plus({ months: 6 })];

    // Fill in gaps with empty doses
    while ((vaccine.schedule.length < 2 && isRotarix) || (vaccine.schedule.length < 3 && !isRotarix)) {
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
    if (vaccine.schedule.length > 2 && isRotarix) {
        vaccine.notes = "Too many doses (2 dose series for Rotavirus with Rotarix).";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    } else if (vaccine.schedule.length > 3 && !isRotarix) {
        vaccine.notes = "Too many doses (3 dose series for Rotavirus with Rotateq or Unknown/Mixed).";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 1, weeks: 2 });
    vaccine.schedule[1].minInterval = dur.fromObject({ months: 1 });
    if (!isRotarix) {
        vaccine.schedule[2].minInterval = dur.fromObject({ months: 1 });
    }


    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });


    // Rotavirus Specific Checks
    if (age.valueOf() > dur.fromObject({ weeks: 15 }) && !vaccine.schedule[0].received) {
        vaccine.schedule.forEach(dose => {
            dose.notes = "No further vaccination is needed.";
            dose.required = false;
        });

        vaccine.notes = "Patient is older than 15 weeks, do not start vaccine series, none needed.";
    }

    if (age.valueOf() > dur.fromObject({ months: 8 }) && vaccine.schedule[0].received) {
        vaccine.schedule.forEach(dose => {
            dose.notes = "No further vaccination is needed.";
            dose.required = false;
        });

        vaccine.notes = "Patient is older than 8 weeks, no further vaccination needed.";
    }

    return vaccine;
}

function dtapScheduler(vaccine, age, dateOfBirth) {
    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = [
        dateOfBirth.plus({ months: 2 }),
        dateOfBirth.plus({ months: 4 }),
        dateOfBirth.plus({ months: 6 }),
        dateOfBirth.plus({ months: 18 }),
        dateOfBirth.plus({ months: 72 })
    ];

    // Fill in gaps with empty doses
    while (vaccine.schedule.length < 5) {
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
    if (vaccine.schedule.length > 5) {
        vaccine.notes = "Too many doses (5 dose series for DTAP)";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 1, weeks: 2 });
    vaccine.schedule[1].minInterval = dur.fromObject({ months: 1 });
    vaccine.schedule[2].minInterval = dur.fromObject({ months: 1 });
    vaccine.schedule[3].minInterval = dur.fromObject({ months: 6 });
    vaccine.schedule[4].minInterval = dur.fromObject({ months: 6 });


    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });


    // DTAP Specific Checks
    if (
        vaccine.schedule[3].received
        && vaccine.schedule[3].intervalSinceLastDose.valueOf() >= dur.fromObject({ months: 6 }).valueOf()
        && vaccine.schedule[3].ageReceived.valueOf() >= dur.fromObject({ years: 4 }).valueOf()
    ) {
        vaccine.schedule[3].notes = "Dose 4 received later than 4 years of age and longer than 6 months since Dose 3: dose 5 not needed.";
        vaccine.schedule[4].required = false;
        vaccine.schedule[4].notes = "Dose 5 no longer required since dose 4 was received later than 4 years of age.";
        vaccine.notes = "Dose 5 not required.";
    }

    return vaccine;
}

function varicellaScheduler(vaccine, age, dateOfBirth) {
    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = [dateOfBirth.plus({ months: 15 }), dateOfBirth.plus({ months: 72 })];

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
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });


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
    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = [dateOfBirth.plus({ months: 15 }), dateOfBirth.plus({ months: 72 })];

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
        vaccine.notes = "Too many doses (2 dose series for MMR)";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 12 });
    vaccine.schedule[1].minInterval = dur.fromObject({ months: 1 });

    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });

    return vaccine;
}

function pcv13Scheduler(vaccine, age, dateOfBirth) {
    // CDC recommended age intervals for each dose (latest date)
    const cdcRecommendedAgeIntervals = [
        dateOfBirth.plus({ months: 2 }),
        dateOfBirth.plus({ months: 4 }),
        dateOfBirth.plus({ months: 6 }),
        dateOfBirth.plus({ months: 15 })
    ];

    // Fill in gaps with empty doses
    while (vaccine.schedule.length < 4) {
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
    if (vaccine.schedule.length > 4) {
        vaccine.notes = "Too many doses (4 dose series for PCV13)";
        vaccine.schedule.forEach((dose, index) => {
            if (index > 1) {
                dose.notes = "This is an extra dose! It is not required.";
                dose.required = false;
            }
        });
    }

    // Set minIntervals
    vaccine.schedule[0].minInterval = dur.fromObject({ months: 1, weeks: 2 });
    vaccine.schedule[1].minInterval = dur.fromObject({ months: 2 });
    vaccine.schedule[2].minInterval = dur.fromObject({ months: 2 });
    vaccine.schedule[3].minInterval = dur.fromObject({ months: 2 });

    // PCV13 Specific interval checks
    if (vaccine.schedule[0].received && vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ months: 12 })) {
        vaccine.schedule[1].minInterval = dur.fromObject({ months: 1 });
    } else if (vaccine.schedule[0].received && vaccine.schedule[0].ageReceived.valueOf() >= dur.fromObject({ months: 12 })) {
        // Leave dose 2 at 2 months, no further dose needed
        vaccine.schedule.forEach((dose, index) => {
            if (index > 2) {
                dose.required = false;
                dose.notes = "First dose received after first birthday, no further doses required.";
            }
        });
    }

    if (vaccine.schedule[1].received && age.valueOf() < dur.fromObject({ months: 12 }) && vaccine.schedule[1].ageReceived.valueOf() < dur.fromObject({ months: 7 })) {
        vaccine.schedule[2].minInterval = dur.fromObject({ months: 1 });
    } else if (vaccine.schedule[1].received && vaccine.schedule[1].ageReceived.valueOf() >= dur.fromObject({ months: 7 }) && vaccine.schedule[1].ageReceived.valueOf() < dur.fromObject({ months: 12 })) {
        vaccine.schedule[2].minInterval = (dur.fromObject({ months: 12 }).valueOf() - age.valueOf()) <= dur.fromObject({ months: 2 }).valueOf() ? dur.fromObject({ months: 2 }) : dur.fromMillis((dur.fromObject({ months: 12 }).valueOf() - age.valueOf()));
    }

    if (
        age.valueOf() >= (dur.fromObject({ months: 12 })
            && (vaccine.schedule[0].received && vaccine.schedule[0].ageReceived.valueOf() < dur.fromObject({ months: 12 }))
            || (vaccine.schedule[1].received && vaccine.schedule[1].ageReceived.valueOf() < dur.fromObject({ months: 12 }))
        )
    ) {
        vaccine.schedule[1].minInterval = dur.fromObject({ months: 2 });
        vaccine.schedule[2].minInterval = dur.fromObject({ months: 2 });
    }


    // Set recommended dates
    cdcRecommendedAgeIntervals.forEach((doseDate, index) => {
        vaccine.schedule[index].latestRecommendedDate = doseDate;
    });

    // Set earliest possible dates
    // If first dose, min interval
    // If subsequent dose AND prev received, date of prev plus min interval
    // If subsequent dose AND prev NOT received, date of prev latestrec plus min interval
    vaccine.schedule.forEach((dose, index) => {
        if (index === 0) {
            dose.earliestPossibleDate = dateOfBirth.plus(dose.minInterval)
        } else {
            dose.earliestPossibleDate = vaccine.schedule[index - 1].received
                ? dt.fromISO(vaccine.schedule[index - 1].date).plus(dose.minInterval)
                : vaccine.schedule[index - 1].latestRecommendedDate.plus(dose.minInterval);
        }
    });


    // PCV13 Specific Checks
    if (
        (vaccine.schedule[0].received && vaccine.schedule[0].ageReceived >= dur.fromObject({ months: 24 }))
        ||
        (vaccine.schedule[1].received && vaccine.schedule[1].ageReceived >= dur.fromObject({ months: 24 }))
    ) {
        vaccine.notes = "First or second dose received after 2 years of age. No further doses required.";
        vaccine.schedule.forEach(dose => {
            if (!dose.received) {
                dose.required = false;
                dose.notes = "Dose not required (Dose 1 or Dose 2 received after 2 years of age)";
            }
        });
    }

    if (age.valueOf() > dur.fromObject({ months: 60 })) {
        vaccine.notes = "Patient over 5 years old; no further doses required.";
        vaccine.schedule.forEach(dose => {
            if (!dose.received) {
                dose.required = false;
                dose.notes = "Dose not required (patient over 5 years old).";
            }
        });
    }

    return vaccine;
}

export default parseSchedule;

/* Test runs */
// const testSchedule = parseSchedule({
//     name: "Varicella",
//     variants: null,
//     variant: null,
//     datesReceived: [],
//     schedule: [],
//     notes: ""
// }, "2010-12-11");

// const testSchedule = parseSchedule({
//     name: "HepA",
//     variants: null,
//     variant: null,
//     datesReceived: [],
//     schedule: [],
//     notes: ""
// }, "2010-12-11");

// const testSchedule = parseSchedule({
//     name: "HepB",
//     variants: null,
//     variant: null,
//     datesReceived: [],
//     schedule: [],
//     notes: ""
// }, "2020-05-24");

// const testSchedule = parseSchedule({
//     name: "HepB",
//     variants: null,
//     variant: null,
//     datesReceived: ["2020-05-24", "2020-07-01", "2020-09-02"],
//     schedule: [],
//     notes: ""
// }, "2010-05-24");

// const testSchedule = parseSchedule({
//     name: "DTAP",
//     variants: null,
//     variant: null,
//     datesReceived: [],
//     schedule: [],
//     notes: ""
// }, "2020-05-24");

// const testSchedule = parseSchedule({
//     name: "DTAP",
//     variants: null,
//     variant: null,
//     datesReceived: ["2018-07-24", "2018-09-25", "2018-11-26", "2019-04-20"],
//     schedule: [],
//     notes: ""
// }, "2010-05-24");

// const testSchedule = parseSchedule({
//     name: "DTAP",
//     variants: null,
//     variant: null,
//     datesReceived: ["2018-07-24", "2018-09-25", "2018-11-26", "2020-04-20"],
//     schedule: [],
//     notes: ""
// }, "2010-05-24");

// const testSchedule = parseSchedule({
//     name: "IPV",
//     variants: null,
//     variant: null,
//     datesReceived: ["2018-07-24", "2018-09-25"],
//     schedule: [],
//     notes: ""
// }, "2010-05-24");

// const testSchedule = parseSchedule({
//     name: "IPV",
//     variants: null,
//     variant: null,
//     datesReceived: [],
//     schedule: [],
//     notes: ""
// }, "2010-05-24");

// const testSchedule = parseSchedule({
//     name: "Rotavirus",
//     variants: ["Rotateq", "Rotarix", "Both/Unknown"],
//     variant: "Rotateq",
//     datesReceived: ["2020-05-29"],
//     schedule: [],
//     notes: ""
// }, "2020-03-24");

// const testSchedule = parseSchedule({
//     name: "HiB",
//     variants: [
//         "PRP-OMP (Pedvax)",
//         "PRP-T (ActHIB, Hiberex, Pentacel)",
//         "Both/Unknown"
//     ],
//     variant: "PRP-T (ActHIB, Hiberex, Pentacel)",
//     datesReceived: [],
//     schedule: [],
//     notes: ""
// }, "2020-05-24");

// const testSchedule = parseSchedule({
//     name: "PCV13",
//     variants: null,
//     variant: null,
//     datesReceived: ["2018-05-24"],
//     schedule: [],
//     notes: ""
// }, "2016-05-24");

// console.log(testSchedule);