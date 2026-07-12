<script lang="ts">
	let { data } = $props();

	import ProductList from './productList.svelte';
</script>

<svelte:head>
	<title>Payment Successful- dana</title>
</svelte:head>
<ProductList productList={data?.productList} />
