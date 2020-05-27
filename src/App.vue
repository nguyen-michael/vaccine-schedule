<template>
  <v-app>
    <p class="display-1 text-center">Vax Check!</p>
    <v-expansion-panels>
      <the-date-of-birth-entry :date-of-birth="dateOfBirth" @change:date="updateDOB" />
    </v-expansion-panels>
    <v-card>
      <v-card-title class="my-2">Enter dates for received doses:</v-card-title>
    </v-card>
    <v-expansion-panels multiple>
      <vaccine-entry
        v-for="(vaccine, i) in this.vaccines"
        :key="vaccine.name"
        :vaccine="vaccine"
        :date-of-birth="dateOfBirth"
        :index="i"
        @update:variant="updateVariant"
        @update:date-received="updateDatesReceived"
      />
    </v-expansion-panels>
    <v-card>
      <v-card-title class="my-2">Vaccine Schedule:</v-card-title>
    </v-card>
    <v-expansion-panels multiple>
      <vaccine-panel v-for="vaccine in this.vaccines" :key="vaccine.name" :vaccine="vaccine" />
    </v-expansion-panels>
  </v-app>
</template>

<script>
import TheDateOfBirthEntry from "./components/TheDateOfBirthEntry.vue";
import VaccineEntry from "./components/VaccineEntry.vue";
import VaccinePanel from "./components/VaccinePanel.vue";
import parseSchedule from "./assets/scheduleCreator.js";

export default {
  name: "App",

  components: {
    TheDateOfBirthEntry,
    VaccineEntry,
    VaccinePanel
  },

  data: () => ({
    dateOfBirth: new Date().toLocaleString("sv").substr(0, 10),
    vaccines: [
      {
        name: "HiB",
        variants: [
          "PRP-OMP (Pedvax)",
          "PRP-T (ActHIB, Hiberex, Pentacel)",
          "Both/Unknown"
        ],
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      },
      {
        name: "HepA",
        variants: null,
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      },
      {
        name: "HepB",
        variants: null,
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      },
      {
        name: "IPV",
        variants: null,
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      },
      {
        name: "Rotavirus",
        variants: ["Rotateq", "Rotarix", "Both/Unknown"],
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      },
      {
        name: "DTAP",
        variants: null,
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      },
      {
        name: "Varicella",
        variants: null,
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      },
      {
        name: "MMR",
        variants: null,
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      },
      {
        name: "PCV13",
        variants: null,
        variant: null,
        datesReceived: [],
        schedule: [],
        notes: ""
      }
    ]
  }),

  methods: {
    updateDOB(date) {
      this.dateOfBirth = date;
      this.vaccines.forEach(vaccine => {
        parseSchedule(vaccine, this.dateOfBirth);
      });
    },

    updateVariant(variant, index) {
      this.vaccines[index].variant = variant;
      this.vaccines[index] = parseSchedule(
        this.vaccines[index],
        this.dateOfBirth
      );
    },

    updateDatesReceived(dateList, index) {
      this.vaccines[index].datesReceived = dateList;

      // run the vaccine parsing here:
      // this.vaccines[index].schedule = dateList.map((date) => {
      //   return {
      //       date: date,
      //       latestRecommendedDate: null,
      //       received: true,
      //       ageReceived: null, // in months?
      //       intervalSinceLastDose: null,
      //       minInterval: null,
      //       late: false,
      //       early: false,
      //       required: true,
      //       notes: "notes specific to this dose."
      //     };
      // });

      this.vaccines[index] = parseSchedule(
        this.vaccines[index],
        this.dateOfBirth
      );
    }
  }
};
</script>
