from pathlib import Path
import re
import time

from playwright.sync_api import sync_playwright


def clean_text(value):
    if not value:
        return ""

    return re.sub(r"\s+", " ", value).strip()


def extract_phone(page):
    try:
        phones = page.locator(
            '[data-item-id^="phone:tel:"]'
        )

        count = phones.count()

        for i in range(count):
            try:
                item_id = phones.nth(i).get_attribute(
                    "data-item-id",
                    timeout=3000,
                )

                if item_id and "phone:tel:" in item_id:
                    phone = item_id.split(
                        "phone:tel:",
                        1,
                    )[1]

                    phone = clean_text(phone)

                    if phone:
                        return phone

            except Exception:
                continue

    except Exception:
        pass

    try:
        phone_buttons = page.locator(
            'button[aria-label^="Phone:"]'
        )

        count = phone_buttons.count()

        for i in range(count):
            try:
                aria = phone_buttons.nth(i).get_attribute(
                    "aria-label",
                    timeout=3000,
                )

                if aria:
                    match = re.search(
                        r"Phone:\s*(.+)",
                        aria,
                        re.IGNORECASE,
                    )

                    if match:
                        phone = clean_text(
                            match.group(1)
                        )

                        if phone:
                            return phone

            except Exception:
                continue

    except Exception:
        pass

    try:
        phone_button = page.locator(
            'button[data-item-id^="phone:tel:"]'
        )

        if phone_button.count() > 0:
            text = phone_button.first.locator(
                "div.Io6YTe"
            ).inner_text(
                timeout=3000
            )

            text = clean_text(text)

            if text:
                return text

    except Exception:
        pass

    return ""

def extract_website(page):

    selectors = [
        'a[data-item-id="authority"]',
        'a[aria-label*="Website" i]',
    ]

    for selector in selectors:
        try:
            locator = page.locator(selector)

            if locator.count() > 0:
                href = locator.first.get_attribute(
                    "href",
                    timeout=3000,
                )

                if href:
                    return href

        except Exception:
            pass

    try:
        links = page.locator(
            'a[href^="http"]'
        )

        count = links.count()

        for i in range(count):
            try:
                href = links.nth(i).get_attribute(
                    "href",
                    timeout=3000,
                )

                if not href:
                    continue

                href_lower = href.lower()

                if "google.com" in href_lower:
                    continue

                if "google.co.in" in href_lower:
                    continue

                if "googleusercontent.com" in href_lower:
                    continue

                return href

            except Exception:
                continue

    except Exception:
        pass

    return ""
def extract_location(page):

    selectors = [
        'button[data-item-id="address"]',
        'div[data-item-id="address"]',
        'button[aria-label*="Address" i]',
        'div[aria-label*="Address" i]',
    ]

    for selector in selectors:

        try:
            locator = page.locator(selector)

            count = locator.count()

            if count == 0:
                continue

            for i in range(count):
                try:
                    element = locator.nth(i)

                    text = element.inner_text(
                        timeout=3000
                    )

                    text = clean_text(text)

                    if text:
                        return text

                except Exception:
                    continue

        except Exception:
            continue

    return ""

def extract_google_maps(
    url: str,
    duration_minutes: float,
    headless: bool = True,
):

    if not url:
        raise ValueError("Google Maps URL is required.")

    if duration_minutes <= 0:
        raise ValueError(
            "Duration must be greater than 0 minutes."
        )

    scroll_seconds = duration_minutes * 60

    results = []

    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled"
            ],
        )

        page = browser.new_page(
            viewport={
                "width": 1440,
                "height": 900,
            }
        )

        try:

            page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=60000,
            )

            page.wait_for_timeout(7000)

            results_panel = None

            try:
                panel = page.locator(
                    'div[role="feed"]'
                )

                if panel.count() > 0:
                    results_panel = panel.first

            except Exception:
                pass

            listings = []
            seen_urls = set()

            start_time = time.time()

            while (
                time.time() - start_time
                < scroll_seconds
            ):

                try:

                    links = page.locator(
                        "a.hfpxzc"
                    )

                    count = links.count()

                    for i in range(count):

                        try:
                            link = links.nth(i)

                            name = clean_text(
                                link.get_attribute(
                                    "aria-label"
                                ) or ""
                            )

                            href = (
                                link.get_attribute(
                                    "href"
                                ) or ""
                            )

                            if not name or not href:
                                continue

                            if href in seen_urls:
                                continue

                            seen_urls.add(href)

                            listings.append({
                                "name": name,
                                "google_maps_url": href,
                            })

                        except Exception:
                            continue

                except Exception:
                    pass

                if results_panel:

                    try:
                        results_panel.evaluate(
                            """
                            element => {
                                element.scrollTop =
                                    element.scrollTop +
                                    element.clientHeight;
                            }
                            """
                        )

                    except Exception:
                        try:
                            page.mouse.wheel(
                                0,
                                1200
                            )
                        except Exception:
                            pass

                else:

                    try:
                        page.mouse.wheel(
                            0,
                            1200
                        )
                    except Exception:
                        pass

                page.wait_for_timeout(2000)

            # Final collection
            try:

                links = page.locator(
                    "a.hfpxzc"
                )

                count = links.count()

                for i in range(count):

                    try:
                        link = links.nth(i)

                        name = clean_text(
                            link.get_attribute(
                                "aria-label"
                            ) or ""
                        )

                        href = (
                            link.get_attribute(
                                "href"
                            ) or ""
                        )

                        if not name or not href:
                            continue

                        if href in seen_urls:
                            continue

                        seen_urls.add(href)

                        listings.append({
                            "name": name,
                            "google_maps_url": href,
                        })

                    except Exception:
                        continue

            except Exception:
                pass
            details_page = browser.new_page(
                viewport={
                    "width": 1440,
                    "height": 900,
                }
            )

            for listing in listings:

                name = listing["name"]
                maps_url = listing[
                    "google_maps_url"
                ]

                try:

                    details_page.goto(
                        maps_url,
                        wait_until="domcontentloaded",
                        timeout=30000,
                    )

                    details_page.wait_for_timeout(
                        3000
                    )

                    business_name = name

                    try:

                        title_locator = (
                            details_page.locator(
                                "h1.DUwDvf"
                            )
                        )

                        if title_locator.count() > 0:

                            extracted_name = clean_text(
                                title_locator
                                .first
                                .inner_text(
                                    timeout=3000
                                )
                            )

                            if extracted_name:
                                business_name = (
                                    extracted_name
                                )

                    except Exception:
                        pass

                    location = extract_location(
                        details_page
                    )

                    phone = extract_phone(
                        details_page
                    )

                    website = extract_website(
                        details_page
                    )

                    results.append({
                        "name": business_name,
                        "location": location,
                        "phone": phone,
                        "website": website,
                        "google_maps_url": maps_url,
                    })

                except Exception:

                    results.append({
                        "name": name,
                        "location": "",
                        "phone": "",
                        "website": "",
                        "google_maps_url": maps_url,
                    })

            details_page.close()

            return results

        finally:

            browser.close()

                