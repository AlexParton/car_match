<script>
    import { createEventDispatcher } from 'svelte'
    const dispatch = createEventDispatcher()
export let question
let inputValue = 3;
</script>

<style>
.option-wrapper {
    padding: 15px 15px 0;
    margin: 20px auto;
    background: var(--grey);
    border-radius: 20px;
    box-shadow: 15px 15px 30px #e3e3e3, -15px -15px 30px #ffffff;
}

h3 {
    font-size: 14px;
}

.labels {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
}

.labels span {
    width: 33%;
    font-size: 9px;
}
.labels span:nth-child(2) {
    text-align: center;
}
.labels span:nth-child(3) {
   text-align: right;
}

.selector-wrapper {
    padding: 8px 0;
}


.slidecontainer {
    width: 95%;
    margin: auto;
}


.slidecontainer input {
  -webkit-appearance: none; 
  appearance: none;
  width: 100%; 
  height: 2px; 
  background: #d3d3d3; 
  outline: none; 
  opacity: 0.7; 
  -webkit-transition: .2s;
  transition: opacity .2s;
  margin: 20px 0; 
}

.slidecontainer input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px; 
  height: 20px; 
  background: #1a1d1a;
  cursor: pointer;
  border-radius: 100%;
}

.slidecontainer input::-moz-range-thumb {
  width: 20px; 
  height: 20px;
  background: #1a1d1a;
  cursor: pointer; 
  
}

@media(min-width: 768px) {
    .option-wrapper {
        width: 45%;
    }
}

</style>

<div class="option-wrapper">
    <h3>{question.question}</h3>
    <div class="selector-wrapper">
        <div class="labels">
            <span>{question.label1}</span>
            <span>{question.label2}</span>
            <span>{question.label3}</span>
        </div>
        <div class="slidecontainer">
            <input bind:value={inputValue} on:input="{() => dispatch('input', [inputValue, question.value])}" type="range" min="1" max="5" step='1'>
        </div>
    </div>
</div>