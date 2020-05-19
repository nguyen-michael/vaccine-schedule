<template>
  <v-expansion-panel>
    <v-expansion-panel-header>{{ vaccine.name }}</v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-select
        v-if="vaccine.variants"
        :items="vaccine.variants"
        v-model="variant"
        label="Choose variant received"
        @change="handleAddVariant"
      ></v-select>
      <v-date-picker
        v-model="date"
        :reactive="true"
        :min="dateOfBirth"
        :max="new Date().toLocaleString('sv').substr(0, 10)"
      >
        <v-btn text color="primary" @click="handleAddDate()">Add Vaccination Date</v-btn>
      </v-date-picker>
      <v-list dense>
        <v-subheader>Selected Dates</v-subheader>
        <v-list-item 
          v-for="(date, i) in dateList" 
          :key="i"
        >
          <v-list-item-content>
            <span>{{ date }}<v-btn outlined small :value="i" @click="handleDeleteDate">Delete</v-btn></span>
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
    date: new Date().toLocaleString('sv').substr(0, 10),
    dateList: [],
    variant: null
  }),

  methods: {
    handleAddDate() {
      // Date validations
      if (this.date < this.dateOfBirth) {
        console.log("Can't get a shot before you're born.");
        return;
      }

      if (this.dateList.includes(this.date)) {
        alert("You've already given a shot on this date.");
        return;
      }

      if (this.dateList.length > 5) {
        alert("That's probably too many shots.");
        return;
      }
      
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