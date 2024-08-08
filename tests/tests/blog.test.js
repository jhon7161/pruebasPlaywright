import { test, describe, expect, beforeEach } from '@playwright/test';
import { loginWith, createBlog,toggleLikeBlog } from '../helper';

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    await request.post('/api/testing/reset');
    await request.post('/api/users', {
      data: {
        name: 'jhon botero',
        username: 'jhon',
        password: 'botero'
      },
    });
    await request.post('/api/users', {
      data: {
        name: 'other user',
        username: 'other',
        password: 'user'
      },
    });
    await page.goto('/');
  });

  test('Login form is shown', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByTestId('username')).toBeVisible();
    await expect(page.getByTestId('password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'login' })).toBeVisible();
  });

  test('Front page can be opened', async ({ page }) => {
    await expect(page.getByText('BLOGS')).toBeVisible();
  });

  test('Login form can be opened', async ({ page }) => {
    await loginWith(page, 'jhon', 'botero');
    await expect(page.getByText('jhon botero ha iniciado sesión')).toBeVisible();
  });

  test('Fails with wrong credentials', async ({ page }) => {
    await loginWith(page, 'jhon', 'wrongpassword');
    await expect(page.getByText('Usuario o contraseña incorrectos')).toBeVisible();
  });

  test('User can create, like, and delete a blog', async ({ page }) => {
    await loginWith(page, 'jhon', 'botero');
    await expect(page.getByText('jhon botero ha iniciado sesión')).toBeVisible();
  
    // Create a new blog
    await createBlog(page, 'Blog de Prueba', 'Autor de Prueba', 'http://blogprueba.com');
  
    // Verify that the new blog appears in the list
    const blogElement = page.locator('[data-testid^="blog-"]').first();
    await expect(blogElement).toBeVisible();
    await expect(blogElement.locator('text=Blog de Prueba')).toBeVisible();
    await expect(blogElement.locator('text=Autor de Prueba')).toBeVisible();
  
    // Show blog details
    await blogElement.locator('[data-testid^="toggle-details-"]').click();
    
    // Like the blog
    const likeButton = blogElement.locator('[data-testid^="like-button-"]');
    await likeButton.click();
    
    // Delete the blog
    const deleteButton = blogElement.locator('[data-testid^="delete-button-"]');
    await deleteButton.click();
    
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe('Are you sure you want to delete the blog?');
      await dialog.accept();
      await expect(page.getByText('Blog eliminado exitosamente')).toBeVisible();
    });
  });

  test('User can edit a blog', async ({ page }) => {
    await loginWith(page, 'jhon', 'botero');
  
    // Create a new blog
    await createBlog(page, 'Blog de Prueba', 'Autor de Prueba', 'http://blogprueba.com');
  
    // Find the newly created blog and show its details
    const blogElement = page.locator('[data-testid^="blog-"]').first();
    await blogElement.locator('[data-testid^="toggle-details-"]').click();
  
    // Click the edit button
    await blogElement.locator('[data-testid^="edit-button-"]').click();
    
    // Edit the blog details
    await page.getByTestId('title-input').fill('Blog de Prueba123');
    await page.getByTestId('author-input').fill('Autor de Prueba456');
    await page.getByTestId('url-input').fill('http://blogprurreba.com');
    
    // Save the changes
    await page.getByTestId('save-button').click();
    
    // Verify the blog has been updated
    await expect(blogElement.locator('text=Blog de Prueba123')).toBeVisible();
    await expect(blogElement.locator('text=Autor de Prueba456')).toBeVisible();
    await expect(blogElement.locator('text=http://blogprurreba.com')).toBeVisible();
  });

  test('Only the creator can see the delete button', async ({ page }) => {
    // Login as the creator
    await loginWith(page, 'jhon', 'botero');
  
    // Create a new blog
    await createBlog(page, 'Blog de Prueba', 'Autor de Prueba', 'http://blogprueba.com');
  
    // Verify the blog is created and the delete button is visible for the creator
    const blogElement = page.locator('[data-testid^="blog-"]').first();
    await expect(blogElement).toBeVisible();
    await blogElement.locator('[data-testid^="toggle-details-"]').click();
    await expect(blogElement.locator('[data-testid^="delete-button-"]')).toBeVisible();
  
    // Logout
    await page.getByRole('button', { name: 'logout' }).click();

    // Login as another user
    await loginWith(page, 'other', 'user');
  
    // Verify that the delete button is not visible for a different user
    const otherUserBlogElement = page.locator('[data-testid^="blog-"]').first();
    await expect(otherUserBlogElement).toBeVisible();
    await otherUserBlogElement.locator('[data-testid^="toggle-details-"]').click();
    await expect(otherUserBlogElement.locator('[data-testid^="delete-button-"]')).not.toBeVisible();
  });
  test('blogs are ordered by likes in descending order', async ({ page }) => {
    await loginWith(page, 'jhon', 'botero');

    // Crear blogs sin likes inicialmente
    const blog1Id = await createBlog(page, 'Blog 1', 'Author 1', 'http://blog1.com');
    const blog2Id = await createBlog(page, 'Blog 2', 'Author 2', 'http://blog2.com');
    const blog3Id = await createBlog(page, 'Blog 3', 'Author 3', 'http://blog3.com');

    // Añadir likes manualmente
    for (let i = 0; i < 5; i++) await toggleLikeBlog(page, blog1Id);  // 5 likes
    for (let i = 0; i < 10; i++) await toggleLikeBlog(page, blog2Id); // 10 likes
    for (let i = 0; i < 3; i++) await toggleLikeBlog(page, blog3Id);  // 3 likes

    // Navegar a la página principal
    await page.goto('/');

    // Esperar a que los blogs se carguen
    await page.waitForSelector('[data-testid^="blog-"]');

    // Obtener todos los blogs
    const blogElements = await page.$$('[data-testid^="blog-"]');
    
    // Expandir detalles de cada blog
    for (const blogElement of blogElements) {
      const toggleButton = await blogElement.$('[data-testid^="toggle-details-"]');
      if (toggleButton) {
        await toggleButton.click();
      }
    }

    // Obtener los likes de cada blog
    const likes = await Promise.all(blogElements.map(async (blogElement) => {
      const likeText = await blogElement.$eval('[data-testid^="like-container-"]', el => el.textContent);
      return parseInt(likeText.match(/\d+/)[0], 10);
    }));

    // Verificar que los likes estén en orden descendente
    for (let i = 0; i < likes.length - 1; i++) {
      expect(likes[i]).toBeGreaterThanOrEqual(likes[i + 1]);
    }
  });

  // Otras pruebas aquí...
});