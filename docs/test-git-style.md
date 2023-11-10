# Test what style markdown GitHub can render

## With CCS styles
<div class="container">
  <img src="./crud-vs-event-sourcing/create.png">
  <span>We can <b>create</b> a new row</span>
</div>

## Left aligned

<span>We can <b>create</b> a new row</span>

<img src="./crud-vs-event-sourcing/create.png" width="200px">

## Inline CSS

<div style="display: flex; align-items: center; gap: 2em; margin-bottom: 1em;">
  <img src="./crud-vs-event-sourcing/create.png" style="width:200px" >
  <span>We can <b>create</b> a new row</span>
</div>

## A float

<img src="./crud-vs-event-sourcing/create.png" style="width:200px; float: left; margin-right: 10px;" >

We can **create** a new row

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
