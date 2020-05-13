<template>
  <div>
    <form>
      <fieldset>
        <label for="date-of-birth">Date of Birth</label>
        <div>
          <input type="date" name="date-of-birth" id="dob" />
          <input type="submit" value="Confirm" />
        </div>
      </fieldset>
    </form>
  </div>
</template>

<script>
export default {
  name: "DateOfBirthEntry"
};
</script>

<style scoped>
</style>
