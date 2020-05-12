<template>
  <div>
    <form>
      <fieldset>
        <label for="date-of-birth">Date of Birth</label>
        <div class="flex-row">
          <input type="date" name="date-of-birth" id="dob" class="flex-small three-fourths" />
          <input type="submit" value="Confirm" class="flex-small one-fourth" />
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
