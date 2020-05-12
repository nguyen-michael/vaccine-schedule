<template>
  <form>
    <fieldset>
      <label for="hepatitis-a">HepA</label>
      <div class="flex-row">
        <input type="date" name="hepatitis-a" id="hepA" class="flex-small three-fourths" />
        <input type="submit" value="Add Date" class="flex-small one-fourth" />
      </div>
      <div class="contain-table">
        <table>
          <thead>
            <th>Dose Number</th>
            <th>Dose Date</th>
            <th>Delete</th>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>2020-02-12</td>
              <td>
                <button class="muted-button">Delete</button>
              </td>
            </tr>
            <tr>
              <td>2</td>
              <td>2020-05-11</td>
              <td>
                <button class="muted-button">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </fieldset>
  </form>
</template>

<script>
export default {
  name: "VaccineEntry"
};
</script>

<style scoped>
</style>