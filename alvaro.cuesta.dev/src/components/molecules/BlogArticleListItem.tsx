import type { Item } from "../../utils/analyze";
import type { BlogItemModuleParsed } from "../../blog/item-module";
import { Link } from "../atoms/Link";
import { BlogDateTime } from "../atoms/BlogDateTime";
import { routeBlogArticle } from "../../routes";

type BlogArticleListItemProps = {
  item: Item<BlogItemModuleParsed>;
};

export const BlogArticleListItem: React.FC<BlogArticleListItemProps> = ({
  item: {
    module: { title, summary, publicationDate, draft, slug },
  },
}) => (
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
