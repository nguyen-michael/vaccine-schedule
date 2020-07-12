<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      <v-row no-gutters>
        <v-col cols="4">{{ vaccine.name }}</v-col>
        <v-col cols="4">
          <span
            v-if="this.dateList.length > 0"
          >{{ this.dateList.length }} {{ this.dateList.length === 1 ? "date" : "dates"}} entered</span>
        </v-col>
        <v-col cols="4">
          <span v-if="this.variant">{{ this.variant.split(" ")[0] }}</span>
        </v-col>
      </v-row>
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-select
        v-if="vaccine.variants"
        :items="vaccine.variants"
        v-model="variant"
        label="Choose variant received"
        @change="handleAddVariant"
      ></v-select>
      <v-text-field
        v-model="date"
        placeholder="Enter Date or Choose below"
      ></v-text-field>
      <v-date-picker
        v-model="date"
        :reactive="true"
        :min="dateOfBirth"
        :max="new Date().toLocaleString('sv').substr(0, 10)"
      >
        <v-btn text color="primary" @click="handleAddDate()">Add Vaccination Date</v-btn>
      </v-date-picker>
      <v-alert type="warning" dismissible v-model="alert">{{ message }}</v-alert>
      <v-list dense>
        <v-subheader>Selected Dates</v-subheader>
        <v-list-item v-for="(date, i) in dateList" :key="i">
          <v-list-item-content>
            <span>
              {{ date }}
              <v-btn outlined small :value="i" @click="handleDeleteDate(i)">Delete</v-btn>
            </span>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
export default {
  name: "VaccineEntry",

  props: {
    vaccine: Object,
    dateOfBirth: String,
    index: Number
  },

  data: () => ({
    date: new Date().toLocaleString("sv").substr(0, 10),
    dateList: [],
    variant: null,
    alert: false,
    message: "warning"
  }),

  methods: {
    handleAddDate() {
      // Date validations
      if (this.date < this.dateOfBirth) {
        this.message = "Cannot receive vaccine before birth.";
        this.alert = true;
        return;
      }

      if (this.dateList.includes(this.date)) {
        this.message = "Vaccine aleready given on this date";
        this.alert = true;
        return;
      }

      if (this.dateList.length > 5) {
        this.message = "That's probably too many vaccinations.";
        this.alert = true;
        return;
      }

      this.alert = false;
      this.dateList = [...this.dateList, this.date].sort();
      this.$emit("update:date-received", this.dateList, this.index);
    },

    handleAddVariant() {
      this.$emit("update:variant", this.variant, this.index);
    },

    handleDeleteDate(dateIndex) {
      this.dateList.splice(dateIndex, 1);
      this.$emit("update:date-received", this.dateList, this.index);
    }
  }
};
</script>