<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      <span class="title">
        Patient Date of Birth:
      </span> {{ dateOfBirth }}
      </v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-date-picker
        v-model="date"
        :reactive="true"
        :show-current="false"
        min="2002-01-01"
        :max="new Date().toLocaleString('sv').substr(0, 10)"
        :value="date"
        @change="handleDOBChange"
      ></v-date-picker>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
export default {
  name: "TheDateOfBirthEntry",

  props: {
    dateOfBirth: String
  },

  data: () => ({
    date: new Date().toLocaleString('sv').substr(0, 10)
  }),

  methods: {
    handleDOBChange() {
      this.$emit("change:date", this.date);
    }
  }
};
</script>