import type { Item } from "../../../utils/analyze";
import type { BlogItemModuleParsed } from "../../../blog/item-module";
import { Link } from "../../../components/atoms/Link";
import { BlogDateTime } from "../../../components/atoms/BlogDateTime";
import { routeBlogArticle } from "../../../routes";

type BlogArticleListItemProps = {
  item: Item<BlogItemModuleParsed>;
};

export function BlogArticleListItem({
  item: {
    module: { title, summary, publicationDate, draft, slug },
  },
}: BlogArticleListItemProps) {
  return (
    <li>
      <div>
        [<BlogDateTime dropTime dateTime={publicationDate} />]{" "}
        <b>
          <Link href={routeBlogArticle.build({ slug })}>{title}</Link>
        </b>
        {draft ? " (draft)" : ""}
      </div>
      {summary ? (
        <small className="blog-article-list-item-summary">{summary}</small>
      ) : null}
    </li>
  );
}
