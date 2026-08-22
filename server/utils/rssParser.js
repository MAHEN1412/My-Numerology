/**
 * Minimal RSS parser. Deliberately extracts ONLY title, link, and pubDate
 * from each <item> — never <description> or <content:encoded>, so nothing
 * resembling article body text ever gets stored or displayed. This is a
 * "headline + link out" news panel, not a content aggregator.
 */

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#8217;/g, '\u2019').replace(/&#8216;/g, '\u2018')
    .replace(/&#8211;/g, '\u2013').replace(/&#8212;/g, '\u2014')
    .replace(/&#8220;/g, '\u201c').replace(/&#8221;/g, '\u201d')
    .replace(/&#039;/g, '\u2019').replace(/&nbsp;/g, ' ')
    .trim();
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

/**
 * Parses raw RSS XML text into an array of { title, link, pubDate }.
 * Silently returns [] on malformed feeds rather than throwing, since one
 * broken source shouldn't take down the whole news panel.
 */
function parseRssItems(xml, sourceName, maxItems = 5) {
  try {
    const items = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    return items.slice(0, maxItems).map((block) => {
      const title = extractTag(block, 'title');
      const link = extractTag(block, 'link');
      const pubDateRaw = extractTag(block, 'pubDate');
      const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;
      return { title, link, source: sourceName, pubDate };
    }).filter((item) => item.title && item.link);
  } catch (err) {
    console.error(`RSS parse failed for ${sourceName}:`, err.message);
    return [];
  }
}

module.exports = { parseRssItems };
