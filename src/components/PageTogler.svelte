<script>
    import { createEventDispatcher } from 'svelte'
    const dispatch = createEventDispatcher();
let isMatcher = false
const togglerHandler = () => {
    isMatcher = !isMatcher
    dispatch('pagetoggler')
}
</script>

<style>
.toggler-wrapper {
    position: fixed;
    top: 0;
    bottom: 0;
    margin: auto;
    height: 100%;
    display: flex;
    align-items: center;
    right: -22px;
    left: calc(100% - 22px);
    transition: 0.3s;
    z-index: 100;
}

.toggler-wrapper.left {
    right: calc(100% - 22px);
    left: -22px
}

.togglerA, .togglerB {
    border: 1px solid black;
    width: 22px;
    padding: 0 3px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    border-radius: 15px 0 0 15px;
    height: 120px;
    position: relative;
    align-items: center;
    background: white;
    font-size: 12px;
    background: yellow;
    cursor: pointer;
}

.togglerB {
    border-radius: 0 15px 15px 0;
    background: red;
}

.togglerA div {
    text-align: center;
    transform: rotate( 
-90deg
 );
}

.togglerB div {
    text-align: center;
    transform: rotate( 
90deg
 );
}
</style>

<div class="{(isMatcher) ? 'toggler-wrapper left' : 'toggler-wrapper'}">
    <div on:click={togglerHandler} class="togglerA" >
        <div>MATCHER</div>
    </div>
    <div on:click={togglerHandler} class="togglerB" >
        <div>BROWSER</div>
    </div>
</div>