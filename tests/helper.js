// helper.js
const loginWith = async (page, username, password) => {
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.getByTestId('username').fill(username);
  await page.getByTestId('password').fill(password);
  await page.getByRole('button', { name: 'login' }).click();
};

const createBlog = async (page, title, author, url) => {
  await page.getByRole('button', { name: 'Nuevo Blog' }).click();
  await page.getByTestId('title').fill(title);
  await page.getByTestId('author').fill(author);
  await page.getByTestId('url').fill(url);
  await page.getByTestId('submit-button').click();
  
  await page.waitForSelector('[data-testid^="blog-"]', { timeout: 5000 });
  const newBlogElement = await page.locator('[data-testid^="blog-"]').last();
  const blogId = await newBlogElement.getAttribute('data-testid');
  
  if (!blogId) {
    throw new Error('Blog ID not found');
  }

  console.log(`Created blog with ID: ${blogId}`);
  return blogId.split('-')[1];
};

const toggleLikeBlog = async (page, blogId) => {
  await page.getByTestId(`toggle-details-${blogId}`).click();
  await page.getByTestId(`like-button-${blogId}`).click();
  await page.getByTestId(`toggle-details-${blogId}`).click();
};

export { loginWith, createBlog, toggleLikeBlog };
