<script lang="ts">
    import { Card, CardContent } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Separator } from '$lib/components/ui/separator';
    import {
        ShieldCheckIcon,
        TruckIcon,
        ActivityIcon,
        ArrowRightIcon,
        SparklesIcon,
        ZapIcon,
        BatteryChargingIcon,
        CheckIcon,
        CpuIcon,
        ScanQrCodeIcon,
        CableIcon,
        SmartphoneIcon,
        HeadphonesIcon,
        LayersIcon,
        ChevronLeftIcon,
        ChevronRightIcon
    } from '@lucide/svelte';
    import { fly, fade } from 'svelte/transition';
    import TeamStoreGallery from '$lib/components/TeamStoreGallery.svelte';

    import Faq from '$lib/components/faq.svelte';
    import Testimonial from '$lib/components/testimonial.svelte';
    import Slider from '$lib/components/slider.svelte';
    import ImgSeparator from '$lib/components/imgSeparator.svelte';
    import Mission from '$lib/components/mission.svelte';
    import * as m from '$lib/paraglide/messages.js';

    type TabKey = 'quality' | 'products' | 'support';
    let activeTab = $state<TabKey>('quality');

    // Interactive slider state for Product Section
    const productShowcaseImages = [
        '/images/products show.webp',
        '/images/products show1.webp',
        '/images/products show2.webp',
        '/images/products show3.webp',
        '/images/products list.webp',
        '/images/products list1.webp'
    ];
    let currentProductImageIndex = $state(0);

    function nextProductImage() {
        currentProductImageIndex = (currentProductImageIndex + 1) % productShowcaseImages.length;
    }

    function prevProductImage() {
        currentProductImageIndex =
            (currentProductImageIndex - 1 + productShowcaseImages.length) % productShowcaseImages.length;
    }

    const tabs = {
        quality: {
            label: m.about_page_tab_quality_label,
            title: m.about_page_tab_quality_title,
            text: m.about_page_tab_quality_text,
            points: [
                m.about_page_tab_quality_point_selected,
                m.about_page_tab_quality_point_performance,
                m.about_page_tab_quality_point_reliable
            ]
        },
        products: {
            label: m.about_page_tab_products_label,
            title: m.about_page_tab_products_title,
            text: m.about_page_tab_products_text,
            points: [
                m.about_page_tab_products_point_mobile,
                m.about_page_tab_products_point_storage,
                m.about_page_tab_products_point_audio
            ]
        },
        support: {
            label: m.about_page_tab_support_label,
            title: m.about_page_tab_support_title,
            text: m.about_page_tab_support_text,
            points: [
                m.about_page_tab_support_point_warranty,
                m.about_page_tab_support_point_technical,
                m.about_page_tab_support_point_replacement
            ]
        }
    } as const;

    const benefits = [
        {
            icon: ShieldCheckIcon,
            title: m.about_page_benefit_quality_title,
            text: m.about_page_benefit_quality_text
        },
        {
            icon: ZapIcon,
            title: m.about_page_benefit_pricing_title,
            text: m.about_page_benefit_pricing_text
        },
        {
            icon: TruckIcon,
            title: m.about_page_benefit_availability_title,
            text: m.about_page_benefit_availability_text
        },
        {
            icon: HeadphonesIcon,
            title: m.about_page_benefit_support_title,
            text: m.about_page_benefit_support_text
        }
    ];

    const stats = [
        {
            value: '5+',
            label: m.about_page_stat_categories_label,
            detail: m.about_page_stat_categories_detail
        },
        {
            value: '100%',
            label: m.about_page_stat_quality_label,
            detail: m.about_page_stat_quality_detail
        },
        {
            value: '24/7',
            label: m.about_page_stat_commitment_label,
            detail: m.about_page_stat_commitment_detail
        },
        {
            value: 'ET',
            label: m.about_page_stat_market_label,
            detail: m.about_page_stat_market_detail
        }
    ];

    const productLayers = [
        {
            icon: BatteryChargingIcon,
            title: m.about_page_layer_power_title,
            text: m.about_page_layer_power_text
        },
        {
            icon: CableIcon,
            title: m.about_page_layer_mobile_title,
            text: m.about_page_layer_mobile_text
        },
        {
            icon: CpuIcon,
            title: m.about_page_layer_storage_title,
            text: m.about_page_layer_storage_text
        },
        {
            icon: HeadphonesIcon,
            title: m.about_page_layer_audio_title,
            text: m.about_page_layer_audio_text
        }
    ];

    const journey = [
        {
            icon: SmartphoneIcon,
            title: m.about_page_journey_explore_title,
            text: m.about_page_journey_explore_text
        },
        {
            icon: ScanQrCodeIcon,
            title: m.about_page_journey_choose_title,
            text: m.about_page_journey_choose_text
        },
        {
            icon: TruckIcon,
            title: m.about_page_journey_support_title,
            text: m.about_page_journey_support_text
        }
    ];

    let { data } = $props();
</script>

<svelte:head>
    <title>{m.about_page_meta_title()}</title>
    <meta name="description" content={m.about_page_meta_description()} />
    <meta name="keywords" content={m.about_page_meta_keywords()} />
    <meta property="og:title" content={m.about_page_meta_title()} />
    <meta property="og:description" content={m.about_page_meta_description()} />
    <meta property="og:image" content="https://dana.et/og-about.jpg" />
</svelte:head>

<div class="relative min-h-screen overflow-hidden  text-foreground">
    <div
        class="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_35%)]"
    ></div>
    <div
        class="absolute left-[-12%] top-32 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl"
    ></div>
    <div
        class="absolute bottom-20 right-[-12%] -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl"
    ></div>

    <!-- Hero Section -->
    <section
        class="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-32 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8"
    >
        <div transition:fly={{ x: -24, duration: 700 }} class="lg:col-span-5">
            <div
                class="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-xl"
            >
                <ActivityIcon class="size-3 animate-pulse" />
                {m.about_page_hero_badge()}
            </div>

            <h1 class="text-5xl font-black leading-none tracking-tight sm:text-7xl">
                {m.about_page_hero_heading()}
            </h1>

            <p class="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
                {m.about_page_hero_description()}
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" href="/shop" class="group gap-2">
                    {m.about_page_shop_now()}
                    <ArrowRightIcon class="size-4 transition-transform group-hover:translate-x-1" />
                </Button>

                <Button
                    size="lg"
                    href="/contact-us"
                    variant="outline"
                    class="border-primary/20 bg-background/40 backdrop-blur-xl"
                >
                    {m.about_page_contact_us()}
                </Button>
            </div>
        </div>

        <div transition:fly={{ x: 24, duration: 700, delay: 150 }} class="lg:col-span-7">
            <Card
                class="relative overflow-hidden border-primary/20 bg-card/40 shadow-2xl backdrop-blur-2xl"
            >
                <div
                    class="grid-drift absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.06)_1px,transparent_1px)] bg-[size:28px_28px]"
                ></div>
                <div class="float-slow absolute right-6 top-6 text-8xl font-black text-primary/10">
                    dana
                </div>

                <CardContent class="relative p-6 sm:p-8">
                    <div class="mb-6 flex items-center justify-between border-b border-primary/10 pb-4">
                        <span class="font-mono text-xs text-muted-foreground">
                            {m.about_page_status_label()}
                        </span>
                        <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            {m.about_page_trusted_status()}
                        </span>
                    </div>

                    <!-- Visual Grid Integration -->
                    <div class="mb-6 grid grid-cols-3 gap-3">
                        <div class="overflow-hidden rounded-xl border border-primary/10">
                            <img
                                src="/images/front desk.webp"
                                alt="Front Desk"
                                class="h-28 w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                        </div>
                        <div class="overflow-hidden rounded-xl border border-primary/10">
                            <img
                                src="/images/working.webp"
                                alt="Team Working"
                                class="h-28 w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                        </div>
                        <div class="overflow-hidden rounded-xl border border-primary/10">
                            <img
                                src="/images/portolio 1.webp"
                                alt="Portfolio Highlight"
                                class="h-28 w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                        </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        {#each benefits as item, i}
                            <div
                                transition:fly={{ y: 16, duration: 500, delay: 200 + i * 80 }}
                                class="group rounded-2xl border border-primary/10 bg-background/40 p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/5"
                            >
                                <div
                                    class="mb-4 flex size-11 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary transition group-hover:scale-110"
                                >
                                    <svelte:component this={item.icon} class="size-5" />
                                </div>
                                <h3 class="text-sm font-bold">{item.title()}</h3>
                                <p class="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text()}</p>
                            </div>
                        {/each}
                    </div>
                </CardContent>
            </Card>
        </div>
    </section>

    <ImgSeparator />

    <!-- Tabs Feature Section with Image Sidecar -->
    <section
        class="border-y border-primary/10  px-4 py-20 backdrop-blur-xl sm:px-6 lg:px-8"
    >
        <div class="mx-auto max-w-6xl">
            <div class="mb-10 text-center">
                <span class="text-xs font-bold uppercase tracking-widest text-primary">
                    {m.about_page_why_label()}
                </span>
                <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                    {m.about_page_why_heading()}
                </h2>
            </div>

            <div
                class="mb-8 grid rounded-2xl border border-primary/10 bg-background/40 p-1.5 backdrop-blur-2xl sm:grid-cols-3"
            >
                {#each Object.entries(tabs) as [key, tab]}
                    <button
                        onclick={() => (activeTab = key as TabKey)}
                        class="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition duration-300 {activeTab ===
                        key
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'}"
                    >
                        {tab.label()}
                    </button>
                {/each}
            </div>

            {#key activeTab}
                <div
                    in:fade={{ duration: 250 }}
                    class="grid gap-8 rounded-3xl border border-primary/10 bg-card/40 p-6 shadow-2xl backdrop-blur-2xl md:grid-cols-12 md:p-8"
                >
                    <div class="md:col-span-7">
                        <div
                            class="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                        >
                            {#if activeTab === 'quality'}
                                <ShieldCheckIcon class="size-6" />
                            {:else if activeTab === 'products'}
                                <ZapIcon class="size-6" />
                            {:else}
                                <HeadphonesIcon class="size-6" />
                            {/if}
                        </div>

                        <h3 class="text-2xl font-black tracking-tight">{tabs[activeTab].title()}</h3>
                        <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
                            {tabs[activeTab].text()}
                        </p>

                        <div class="mt-6 space-y-3">
                            {#each tabs[activeTab].points as point}
                                <div
                                    class="flex items-center gap-3 rounded-xl border border-primary/10 bg-background/40 p-3"
                                >
                                    <span class="rounded-full bg-primary/10 p-1 text-primary">
                                        <CheckIcon class="size-3" />
                                    </span>
                                    <span class="text-sm font-medium">{point()}</span>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <div class="relative overflow-hidden rounded-2xl border border-primary/10 md:col-span-5">
                        <img
                            src="/images/products show.webp"
                            alt="Products Detail Showcase"
                            class="h-full w-full object-cover"
                        />
                        <div
                            class="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"
                        ></div>
                        <div class="absolute bottom-4 left-4 right-4 text-xs text-muted-foreground">
                            Precision Quality Assurance
                        </div>
                    </div>
                </div>
            {/key}
        </div>
    </section>

    <ImgSeparator />

    <!-- Stats Section -->
    <section class="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div class="absolute inset-x-8 top-24 -z-10 h-48 rounded-full bg-primary/10 blur-3xl"></div>

        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {#each stats as stat, i}
                <div
                    transition:fly={{ y: 18, duration: 500, delay: i * 80 }}
                    class="float-card group relative overflow-hidden rounded-3xl border border-primary/10 bg-card/35 p-6 shadow-xl backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-primary/5"
                >
                    <div
                        class="absolute -right-12 -top-12 size-28 rounded-full bg-primary/10 blur-2xl transition duration-500 group-hover:scale-150"
                    ></div>
                    <div class="relative">
                        <p class="font-mono text-4xl font-black tracking-tighter text-primary">{stat.value}</p>
                        <h3 class="mt-3 text-sm font-bold uppercase tracking-wider">{stat.label()}</h3>
                        <p class="mt-2 text-xs leading-relaxed text-muted-foreground">{stat.detail()}</p>
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <ImgSeparator />

    <!-- Manufacturing & Operations Feature Gallery Section -->
    <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div class="mb-10 text-center">
            <h2 class="text-3xl font-black tracking-tight sm:text-4xl">State-of-the-Art Operations</h2>
            <p class="mt-2 text-sm text-muted-foreground">Inside our development and manufacturing facilities</p>
        </div>

        <div class="grid gap-4 md:grid-cols-12">
            <div class="relative overflow-hidden rounded-3xl border border-primary/10 md:col-span-8">
                <img
                    src="/images/manufacture top view.webp"
                    alt="Facility Top View"
                    class="h-72 w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
                <div class="absolute bottom-6 left-6">
                    <span class="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-md">
                        Manufacturing Hub
                    </span>
                    <h3 class="mt-2 text-xl font-bold">Assembly & Testing Center</h3>
                </div>
            </div>

            <div class="relative overflow-hidden rounded-3xl border border-primary/10 md:col-span-4">
                <img
                    src="/images/manufacture.webp"
                    alt="Manufacturing Process"
                    class="h-72 w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
                <div class="absolute bottom-6 left-6">
                    <h3 class="text-lg font-bold">Strict Standards</h3>
                </div>
            </div>

            <div class="relative overflow-hidden rounded-3xl border border-primary/10 md:col-span-6">
                <img
                    src="/images/welcome.webp"
                    alt="Welcome Reception"
                    class="h-56 w-full object-cover transition-transform duration-700 hover:scale-105"
                />
            </div>

            <div class="relative overflow-hidden rounded-3xl border border-primary/10 md:col-span-6">
                <img
                    src="/images/client.webp"
                    alt="Client Engagement"
                    class="h-56 w-full object-cover transition-transform duration-700 hover:scale-105"
                />
            </div>
        </div>
    </section>

    <ImgSeparator />

    <!-- Categories & Embedded Interactive Product Image Slider -->
    <section
        class="relative overflow-hidden border-y border-primary/10 bg-card/20 px-4 py-24 backdrop-blur-xl sm:px-6 lg:px-8"
    >
        <div
            class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.12),transparent_45%)]"
        ></div>
        <div class="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12 lg:items-center">
            <!-- Product Slider Column -->
            <div class="lg:col-span-5">
                <div
                    class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary backdrop-blur-xl"
                >
                    <LayersIcon class="size-3" />
                    {m.about_page_product_categories_label()}
                </div>
                <h2 class="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
                    {m.about_page_product_categories_title()}
                </h2>
                <p class="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                    {m.about_page_product_categories_description()}
                </p>

                <!-- Interactive Mini Image Slider -->
                <div class="relative mt-8 overflow-hidden rounded-2xl border border-primary/20 shadow-xl">
                    <img
                        src={productShowcaseImages[currentProductImageIndex]}
                        alt="Product Showcase Slider"
                        class="h-64 w-full object-cover transition-all duration-500"
                    />
                    <div class="absolute bottom-3 right-3 flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="secondary"
                            class="size-8 rounded-full border border-primary/20 bg-background/70 backdrop-blur-md"
                            onclick={prevProductImage}
                        >
                            <ChevronLeftIcon class="size-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="secondary"
                            class="size-8 rounded-full border border-primary/20 bg-background/70 backdrop-blur-md"
                            onclick={nextProductImage}
                        >
                            <ChevronRightIcon class="size-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Product Layers Cards -->
            <div class="grid gap-4 sm:grid-cols-2 lg:col-span-7">
                {#each productLayers as layer, i}
                    <Card
                        class="group relative overflow-hidden border-primary/10 bg-background/35 backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-primary/5"
                    >
                        <div
                            class="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),transparent_45%)] opacity-0 transition duration-500 group-hover:opacity-100"
                        ></div>
                        <CardContent class="relative p-6">
                            <div
                                class="mb-5 flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary transition duration-500 group-hover:scale-110 group-hover:rotate-6"
                            >
                                <svelte:component this={layer.icon} class="size-6" />
                            </div>
                            <span class="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                            <h3 class="mt-2 text-lg font-black">{layer.title()}</h3>
                            <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{layer.text()}</p>
                        </CardContent>
                    </Card>
                {/each}
            </div>
        </div>
    </section>

    <ImgSeparator />

    <TeamStoreGallery />

    <ImgSeparator />

    <!-- Journey Section -->
    <section class="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
            <span class="text-xs font-bold uppercase tracking-widest text-primary">
                {m.about_page_buying_flow_label()}
            </span>
            <h2 class="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                {m.about_page_buying_flow_title()}
            </h2>
        </div>

        <div class="relative grid gap-5 lg:grid-cols-3">
            <div class="absolute left-0 right-0 top-1/2 -z-10 hidden h-px bg-primary/20 lg:block"></div>
            {#each journey as step, i}
                <div
                    class="group relative rounded-3xl border border-primary/10 bg-card/40 p-6 shadow-xl backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-primary/30"
                >
                    <div
                        class="absolute -top-3 left-6 rounded-full border border-primary/20 bg-background px-3 py-1 font-mono text-xs text-primary shadow-lg"
                    >
                        {m.about_page_step_label({ number: i + 1 })}
                    </div>
                    <div
                        class="mt-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl transition duration-500 group-hover:scale-110"
                    >
                        <svelte:component this={step.icon} class="size-6" />
                    </div>
                    <h3 class="mt-6 text-xl font-black">{step.title()}</h3>
                    <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text()}</p>
                </div>
            {/each}
        </div>
    </section>

    <ImgSeparator />

    <Mission />

    <ImgSeparator />

    <!-- CTA Section -->
    <section class="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <div
            class="relative overflow-hidden rounded-3xl border border-primary/20 bg-card/40 p-8 shadow-2xl backdrop-blur-2xl sm:p-12"
        >
            <div
                class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_45%)]"
            ></div>

            <div class="mx-auto flex max-w-xl flex-col items-center gap-6">
                <div
                    class="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary"
                >
                    <SparklesIcon class="size-3" />
                    {m.about_page_cta_badge()}
                </div>

                <h2 class="text-3xl font-black tracking-tight sm:text-4xl">
                    {m.about_page_cta_title()}
                </h2>

                <p class="text-sm leading-relaxed text-muted-foreground">
                    {m.about_page_cta_description()}
                </p>

                <Separator class="bg-primary/10" />

                <Button href="/shop" size="lg" class="group gap-2">
                    {m.about_page_shop_now()}
                    <ZapIcon class="size-4 transition-transform group-hover:scale-110" />
                </Button>
            </div>
        </div>
    </section>
</div>

<ImgSeparator />

{#if data?.imagesList?.length > 0}
    <Slider imagesList={data.imagesList} />
{/if}

<ImgSeparator />

{#if data?.testimonialList?.length > 0}
    <main class="flex flex-col items-center justify-center px-4 py-16">
        <div class="mb-10 max-w-2xl text-center">
            <h2 class="text-3xl font-bold md:text-4xl">{m.about_page_testimonials_title()}</h2>
            <p class="mt-3 text-muted-foreground">
                {m.about_page_testimonials_description()}
            </p>
        </div>

        <Testimonial testimonials={data.testimonialList} />
    </main>
{/if}

<ImgSeparator />

<Faq />

<style>
    @keyframes float-slow {
        0%,
        100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
        }
        50% {
            transform: translate3d(0, -14px, 0) rotate(-2deg);
        }
    }

    @keyframes grid-drift {
        0% {
            background-position: 0 0;
        }
        100% {
            background-position: 56px 56px;
        }
    }

    .float-slow {
        animation: float-slow 7s ease-in-out infinite;
    }

    .float-card:nth-child(odd) {
        animation: float-slow 8s ease-in-out infinite;
    }

    .float-card:nth-child(even) {
        animation: float-slow 9s ease-in-out infinite reverse;
    }

    .grid-drift {
        animation: grid-drift 18s linear infinite;
    }
</style>