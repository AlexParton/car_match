<script>
import CardWrapper from "./components/CardWrapper.svelte";
import MatcherWrapper from "./components/MatcherWrapper.svelte";
import PageTogler from "./components/PageTogler.svelte";
import Topbar from "./components/Topbar.svelte";

let isBrowser = true

</script>

<style>
	.superwrapper {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.cardwrapper {
		position: relative;
		top: 0;
		left: 0;
		transition: .3s;
		width: 100%;
	}

	.cardwrapper.hide{
		left: -100%;
	}

	.matchwrapper {
		position: fixed;
		top: 0;
		left: 100%;
		transition: .3s;
		width: 100%;
		overflow-y: scroll;
   		overflow-x: hidden;
		top: 0;
   		bottom:0;
   
	}

	.matchwrapper.show {
		left: 0;
	}
</style>
<Topbar />
<PageTogler on:pagetoggler={() => isBrowser = !isBrowser}/>

<div class="superwrapper">
	<div class={(isBrowser) ? 'cardwrapper' : 'cardwrapper hide'}>
		<CardWrapper />
	</div>
	<div class={(isBrowser) ? 'matchwrapper' : 'matchwrapper show'}>
		<MatcherWrapper />
	</div>
</div>
