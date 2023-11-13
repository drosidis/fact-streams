# Test what style markdown GitHub can render

## With CCS styles
<div class="container">
  <img src="./crud-vs-event-sourcing/create.png">
  <span>We can <b>create</b> a new row</span>
</div>

## Left aligned

The data is organised in tables with rows (objects) and columns (keys):

<img src="./crud-vs-event-sourcing/table.png" width="200px">

We can **create** a new row:

<img src="./crud-vs-event-sourcing/create.png" width="200px">

We can <b>update</b> cells in an existing row:

<img src="./crud-vs-event-sourcing/update.png" width="200px">

## Inline CSS

<div style="display: flex; align-items: center; gap: 2em; margin-bottom: 1em;">
  <img src="./crud-vs-event-sourcing/create.png" style="width:200px" >
  <span>We can <b>create</b> a new row</span>
</div>

## A float

<img src="./crud-vs-event-sourcing/create.png" style="width:200px; float: left; margin-right: 10px;" >

We can **create** a new row

## Inline

![create_200.png](./create_200.png) We can **create** a new row

## Inline with vertical align

<img src="./create_200.png" style="width:200px; margin-right: 10px; vertical-align: middle;" > We can **create** a new row

### With list items

- We can **create** a new row

<img src="./crud-vs-event-sourcing/create.png" style="width:200px;" >

- We can **create** a new row

<img src="./crud-vs-event-sourcing/create.png" style="width:200px;" >

- We can **create** a new row
<img src="./crud-vs-event-sourcing/create.png" style="width:200px;" >

- We can **create** a new row
<img src="./crud-vs-event-sourcing/create.png" style="width:200px;" >

<style>
  h2 {
    clear:both;
  }
  .container {
    display: flex;
    align-items: center;
    gap: 2em;
    margin-bottom: 1em;
  }
  .container img {
    width: 200px;
  }
</style>
