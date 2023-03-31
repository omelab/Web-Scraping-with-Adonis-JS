import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import * as cheerio from 'cheerio'
import axios from 'axios'
// import json2csv from 'json2csv'
// import * as fsp from 'fs/promises'

export default class PostsController {
  /**
   * Get a list authors
   * GET /authors?withTrashed=1
   */
  public async index({ request }: HttpContextContract) {
    const sitemapUrl = 'https://www.prothomalo.com/sitemap/sitemap-daily-2023-03-09.xml'
    const listItem = await this.getProthomaloDaily(sitemapUrl)
    const result = await this.getDetails(listItem)
    return result
  }

  //daily sitemap
  private async getProthomaloDaily(url: string) {
    const pageResponse = await axios.get(url)
    const loc: any = []

    const $ = cheerio.load(pageResponse.data, { xmlMode: true })

    $('urlset > url').each((index, ref) => {
      const elem = $(ref)

      const lastUpdate = elem.find('lastmod').text().trim()
      const url = elem.find('loc').text().trim()
      const image = $(elem).find('image\\:image')
      const images: any = []

      image.each((_index, ref) => {
        const src: string = $(ref).find('image\\:loc').text().trim()
        const caption: string = $(ref).find('image\\:caption').text().trim()
        images.push({
          src,
          caption,
          lastUpdate,
        })
      })

      loc[index] = {
        url,
        images,
      }
    })

    return loc
  }

  //get Details from list
  private async getDetails(listItems: Array<any>) {
    if (listItems.length > 0) {
      const result: any = []
      //   const chunkSize = 30
      //   let chunk: any = []
      //   for (let i = 0; i < listItems.length; i += chunkSize) {
      //     chunk = listItems.slice(i, i + chunkSize)
      //   }

      for (let i = 0; i < 20; i++) {
        const item = listItems[i]
        const pageResponse = await axios.get(item.url)
        const $ = cheerio.load(pageResponse.data, null, false)

        const title = $('.print-meta-content h1').text().trim()
        const subTitle = $('.story-title-info p').text()
        const title2 = $('.story-content h1').text().trim()
        const heading2 = $('.story-content h2').text().trim()
        const publishDate = $('.time-social-share-wrapper time').attr('datetime')

        const category: Array<string> = []

        $('.print-entity-section-wrapper a').each((_index, ref) => {
          let cat = $(ref).text().trim()
          category.push(cat)
        })

        // const author = $('.author-name-location-wrapper .contributor-name').text().trim()
        // const location = $('.author-name-location-wrapper .author-location').text().trim()
        // const caption = $('.story-element-image-caption').text().trim()

        const metaDescription = $("meta[name='description']").attr('content')
        const metaKeyword = $("meta[name='keywords']").attr('content')

        let description = ''
        $('.story-element').each((_index, ref) => {
          const content = $(ref).find('.story-element-text').html()
          if (content) {
            description += content
          }
        })

        let tags: Array<string> = []
        $('.tag-list a').each((_index, ref) => {
          const tagText = $(ref).text().trim()
          tags.push(tagText)
        })

        const nextObj = {
          title,
          article: description,
          category: category,
          image: item.images[0]['src'],
          source: 'prothomalo',
          meta_title: title,
          meta_description: metaDescription,
          meta_keyword: metaKeyword,
          tags: tags,
          url: item.url,
          news_date: publishDate,
          sub_title: {
            sub_h1: title2,
            sub_h2: heading2,
            sub_details: subTitle,
          },
        }
        result.push(nextObj)
      }

      return result
    }
  }

  //save records as csv
  //   private async seveRecord(countries: Array<any>) {
  //     console.info(`Saving ${countries.length} records`)

  //     const j2cp = new json2csv.Parser()
  //     const csv = j2cp.parse(countries)

  //     await fsp.writeFile('./output.csv', csv, { encoding: 'utf-8' })
  //   }
}
